import crypto from 'node:crypto';
import http from 'node:http';
import { shell } from 'electron';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { ChatGptConnectionStatus } from '../src/shared/api';
import type { CredentialVault } from './credential-vault';

const AUTHORIZE_URL = 'https://auth.openai.com/api/accounts/authorize';
const TOKEN_URL = 'https://auth.openai.com/api/accounts/oauth/token';
const DISCOVERY_URL = 'https://auth.openai.com/.well-known/openid-configuration';
const RESOURCE = 'https://api.openai.com/v1';
const SCOPES = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const PROFILE_KEY = 'chatgpt:oauth-profile:default';
const HOST_KEY = 'chatgpt:oauth-host-id';

interface StoredProfile {
  email?: string;
  name?: string;
  issuer: string;
  subject: string;
  clientId: string;
  hostId: string;
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: string;
  scopes: string[];
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface DiscoveryDocument {
  issuer: string;
  jwks_uri: string;
  revocation_endpoint?: string;
}

interface CallbackResult {
  code: string;
  clientId?: string;
  scope?: string;
}

function base64Url(value: Buffer): string {
  return value.toString('base64url');
}

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = base64Url(crypto.randomBytes(48));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function buildAuthorizationUrl(input: {
  redirectUri: string;
  state: string;
  nonce: string;
  challenge: string;
  hostId: string;
  profile?: Pick<StoredProfile, 'clientId' | 'idToken' | 'email'>;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', input.profile?.clientId ?? 'dynamic_agent_client');
  url.searchParams.set('ext_agent_host_id', input.hostId);
  if (!input.profile) {
    url.searchParams.set('agent_name_hint', 'SynapseDock');
  } else {
    url.searchParams.set('id_token_hint', input.profile.idToken);
    if (input.profile.email) url.searchParams.set('login_hint', input.profile.email);
  }
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('resource', RESOURCE);
  url.searchParams.set('state', input.state);
  url.searchParams.set('nonce', input.nonce);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('code_challenge', input.challenge);
  return url.toString();
}

export function parseAuthorizationCallback(url: URL, expectedState: string): CallbackResult {
  if (url.pathname !== '/auth/callback') throw new Error('Unexpected OAuth callback path.');
  if (url.searchParams.get('state') !== expectedState) throw new Error('OAuth state validation failed.');
  const error = url.searchParams.get('error');
  if (error) throw new Error(url.searchParams.get('error_description') || error);
  const code = url.searchParams.get('code');
  if (!code) throw new Error('OAuth callback did not include an authorization code.');
  return { code, clientId: url.searchParams.get('client_id') ?? undefined, scope: url.searchParams.get('scope') ?? undefined };
}

export function publicStatus(profile?: StoredProfile): ChatGptConnectionStatus {
  if (!profile) return { connected: false, planUsage: false };
  return {
    connected: true,
    planUsage: profile.scopes.includes('chatgpt.tokens.use.direct') && profile.scopes.includes('resource.invoke'),
    email: profile.email,
    name: profile.name,
    expiresAt: profile.expiresAt,
  };
}

export class ChatGptOAuth {
  private pending = false;

  constructor(private readonly vault: CredentialVault) {}

  getStatus(): ChatGptConnectionStatus {
    return publicStatus(this.readProfile());
  }

  async signIn(): Promise<ChatGptConnectionStatus> {
    if (this.pending) throw new Error('A ChatGPT sign-in is already in progress.');
    this.pending = true;
    try {
      const existing = this.readProfile();
      const hostId = existing?.hostId ?? await this.getOrCreateHostId();
      const state = base64Url(crypto.randomBytes(32));
      const nonce = base64Url(crypto.randomBytes(32));
      const { verifier, challenge } = createPkce();
      const callback = await this.authorize({ state, nonce, challenge, hostId, profile: existing });
      const clientId = existing?.clientId ?? callback.clientId;
      if (!clientId || clientId === 'dynamic_agent_client') throw new Error('ChatGPT did not return an issued client ID.');
      if (existing && callback.clientId && callback.clientId !== existing.clientId) throw new Error('ChatGPT returned a client ID for a different registration.');

      const token = await this.exchangeCode(callback.code, clientId, verifier, callback.redirectUri);
      if (!token.id_token || !token.access_token) throw new Error('ChatGPT token response was incomplete.');
      const discovery = await this.discovery();
      const keySet = createRemoteJWKSet(new URL(discovery.jwks_uri));
      const verified = await jwtVerify(token.id_token, keySet, { issuer: discovery.issuer, audience: clientId });
      if (verified.payload.nonce !== nonce) throw new Error('ChatGPT ID token nonce validation failed.');
      if (!verified.payload.sub) throw new Error('ChatGPT ID token did not contain an account subject.');
      if (existing && existing.subject !== verified.payload.sub) throw new Error('The selected ChatGPT account does not match the saved registration.');

      const scopes = (token.scope ?? callback.scope ?? '').split(/\s+/).filter(Boolean);
      const profile: StoredProfile = {
        email: typeof verified.payload.email === 'string' ? verified.payload.email : undefined,
        name: typeof verified.payload.name === 'string' ? verified.payload.name : undefined,
        issuer: discovery.issuer,
        subject: verified.payload.sub,
        clientId,
        hostId,
        idToken: token.id_token,
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? existing?.refreshToken,
        tokenType: token.token_type ?? 'Bearer',
        expiresAt: new Date(Date.now() + Math.max(0, token.expires_in ?? 0) * 1000).toISOString(),
        scopes,
      };
      await this.vault.set(PROFILE_KEY, JSON.stringify(profile));
      return publicStatus(profile);
    } finally { this.pending = false; }
  }

  async signOut(): Promise<{ remoteRevoked: boolean }> {
    const profile = this.readProfile();
    let remoteRevoked = false;
    if (profile?.refreshToken) {
      try {
        const discovery = await this.discovery();
        if (discovery.revocation_endpoint) {
          const response = await fetch(discovery.revocation_endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token: profile.refreshToken, token_type_hint: 'refresh_token', client_id: profile.clientId }),
          });
          remoteRevoked = response.ok;
        }
      } catch { remoteRevoked = false; }
    }
    this.vault.delete(PROFILE_KEY);
    return { remoteRevoked };
  }

  private readProfile(): StoredProfile | undefined {
    const raw = this.vault.get(PROFILE_KEY);
    if (!raw) return undefined;
    try { return JSON.parse(raw) as StoredProfile; }
    catch { return undefined; }
  }

  private async getOrCreateHostId(): Promise<string> {
    const saved = this.vault.get(HOST_KEY);
    if (saved?.startsWith('urn:uuid:')) return saved;
    const created = `urn:uuid:${crypto.randomUUID()}`;
    await this.vault.set(HOST_KEY, created);
    return created;
  }

  private async authorize(input: { state: string; nonce: string; challenge: string; hostId: string; profile?: StoredProfile }): Promise<CallbackResult & { redirectUri: string }> {
    const server = http.createServer();
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') { server.close(); throw new Error('Unable to start the local OAuth callback.'); }
    const redirectUri = `http://127.0.0.1:${address.port}/auth/callback`;
    let timeout!: NodeJS.Timeout;
    const result = new Promise<CallbackResult>((resolve, reject) => {
      timeout = setTimeout(() => { server.close(); reject(new Error('ChatGPT sign-in timed out.')); }, 5 * 60_000);
      server.on('request', (request, response) => {
        try {
          const callback = parseAuthorizationCallback(new URL(request.url ?? '/', redirectUri), input.state);
          response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          response.end('<!doctype html><meta charset="utf-8"><title>SynapseDock</title><p>Sign-in complete. You can close this window and return to SynapseDock.</p>');
          clearTimeout(timeout); server.close(); resolve(callback);
        } catch (error) {
          response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
          response.end('Sign-in could not be completed. Return to SynapseDock.');
          clearTimeout(timeout); server.close(); reject(error);
        }
      });
    });
    const authorizationUrl = buildAuthorizationUrl({ redirectUri, state: input.state, nonce: input.nonce, challenge: input.challenge, hostId: input.hostId, profile: input.profile });
    try { await shell.openExternal(authorizationUrl); }
    catch (error) { clearTimeout(timeout); server.close(); throw error; }
    return { ...(await result), redirectUri };
  }

  private async exchangeCode(code: string, clientId: string, verifier: string, redirectUri: string): Promise<TokenResponse> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, code, code_verifier: verifier, redirect_uri: redirectUri, resource: RESOURCE }),
    });
    const token = await response.json() as TokenResponse;
    if (!response.ok || token.error) throw new Error(token.error_description || token.error || `ChatGPT token exchange failed with HTTP ${response.status}.`);
    return token;
  }

  private async discovery(): Promise<DiscoveryDocument> {
    const response = await fetch(DISCOVERY_URL, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`OpenAI discovery failed with HTTP ${response.status}.`);
    const discovery = await response.json() as DiscoveryDocument;
    if (discovery.issuer !== 'https://auth.openai.com' || !discovery.jwks_uri?.startsWith('https://auth.openai.com/')) throw new Error('OpenAI discovery metadata was not trusted.');
    return discovery;
  }
}
