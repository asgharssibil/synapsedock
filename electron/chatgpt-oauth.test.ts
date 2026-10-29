import http from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { shell } from 'electron';
import { jwtVerify } from 'jose';
import { buildAuthorizationUrl, createPkce, parseAuthorizationCallback, publicStatus } from './chatgpt-oauth';

vi.mock('electron', () => ({ shell: { openExternal: vi.fn() } }));
vi.mock('jose', () => ({ createRemoteJWKSet: vi.fn(() => 'mock-key-set'), jwtVerify: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('official ChatGPT OAuth helpers', () => {
  it('creates a PKCE verifier and matching SHA-256 challenge', () => {
    const first = createPkce();
    const second = createPkce();
    expect(first.verifier.length).toBeGreaterThan(42);
    expect(first.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first.challenge).not.toBe(first.verifier);
    expect(second.verifier).not.toBe(first.verifier);
  });

  it('builds first-time authorization with official endpoints and required scopes', () => {
    const url = new URL(buildAuthorizationUrl({
      redirectUri: 'http://127.0.0.1:4567/auth/callback', state: 'state-value', nonce: 'nonce-value', challenge: 'challenge-value', hostId: 'urn:uuid:host-id',
    }));
    expect(url.origin).toBe('https://auth.openai.com');
    expect(url.pathname).toBe('/api/accounts/authorize');
    expect(url.searchParams.get('client_id')).toBe('dynamic_agent_client');
    expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:4567/auth/callback');
    expect(url.searchParams.get('scope')).toContain('chatgpt.tokens.use.direct');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('ext_agent_host_id')).toBe('urn:uuid:host-id');
  });

  it('rejects a callback with a mismatched state', () => {
    const callback = new URL('http://127.0.0.1:4567/auth/callback?code=secret-code&state=wrong');
    expect(() => parseAuthorizationCallback(callback, 'expected')).toThrow('state validation failed');
  });

  it('rejects malformed, denied, and code-less callbacks', () => {
    expect(() => parseAuthorizationCallback(new URL('http://127.0.0.1/wrong?state=s'), 's')).toThrow('Unexpected OAuth callback path');
    expect(() => parseAuthorizationCallback(new URL('http://127.0.0.1/auth/callback?state=s&error=access_denied&error_description=No'), 's')).toThrow('No');
    expect(() => parseAuthorizationCallback(new URL('http://127.0.0.1/auth/callback?state=s'), 's')).toThrow('authorization code');
    expect(parseAuthorizationCallback(new URL('http://127.0.0.1/auth/callback?state=s&code=c&client_id=id&scope=openid'), 's')).toEqual({ code: 'c', clientId: 'id', scope: 'openid' });
  });

  it('adds hints for an existing registered account and reports disconnected state', () => {
    const url = new URL(buildAuthorizationUrl({
      redirectUri: 'http://127.0.0.1:1/auth/callback', state: 's', nonce: 'n', challenge: 'c', hostId: 'urn:uuid:h',
      profile: { clientId: 'oaiapp_saved', idToken: 'id-token', email: 'saved@example.com' },
    }));
    expect(url.searchParams.get('id_token_hint')).toBe('id-token');
    expect(url.searchParams.get('login_hint')).toBe('saved@example.com');
    expect(url.searchParams.has('agent_name_hint')).toBe(false);
    expect(publicStatus()).toEqual({ connected: false, planUsage: false });
  });

  it('returns only non-secret status fields to the renderer', () => {
    const status = publicStatus({
      email: 'user@example.com', name: 'User', issuer: 'https://auth.openai.com', subject: 'subject', clientId: 'oaiapp_test', hostId: 'urn:uuid:test',
      idToken: 'id-secret', accessToken: 'access-secret', refreshToken: 'refresh-secret', tokenType: 'Bearer', expiresAt: '2030-01-01T00:00:00.000Z',
      scopes: ['openid', 'resource.invoke', 'chatgpt.tokens.use.direct'],
    });
    expect(status).toEqual({ connected: true, planUsage: true, email: 'user@example.com', name: 'User', expiresAt: '2030-01-01T00:00:00.000Z' });
    expect(JSON.stringify(status)).not.toContain('secret');
  });
});

describe('ChatGPT OAuth lifecycle', () => {
  function vaultFixture(initial: Record<string, string> = {}) {
    const values = new Map(Object.entries(initial));
    return {
      values,
      vault: {
        get: vi.fn((key: string) => values.get(key)),
        set: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
        delete: vi.fn((key: string) => values.delete(key)),
      },
    };
  }

  it('completes browser PKCE login, validates identity, and stores tokens only in the vault', async () => {
    const { ChatGptOAuth } = await import('./chatgpt-oauth');
    const fixture = vaultFixture();
    let nonce = '';
    vi.mocked(shell.openExternal).mockImplementation(async (rawUrl) => {
      const auth = new URL(rawUrl);
      nonce = auth.searchParams.get('nonce') ?? '';
      const callback = new URL(auth.searchParams.get('redirect_uri')!);
      callback.searchParams.set('state', auth.searchParams.get('state')!);
      callback.searchParams.set('code', 'authorization-code');
      callback.searchParams.set('client_id', 'oaiapp_synapsedock');
      callback.searchParams.set('scope', 'openid resource.invoke chatgpt.tokens.use.direct');
      await new Promise<void>((resolve, reject) => http.get(callback, (response) => { response.resume(); response.on('end', resolve); }).on('error', reject));
    });
    vi.stubGlobal('fetch', vi.fn(async (rawUrl: string | URL) => {
      const url = String(rawUrl);
      if (url.endsWith('/.well-known/openid-configuration')) return new Response(JSON.stringify({ issuer: 'https://auth.openai.com', jwks_uri: 'https://auth.openai.com/jwks', revocation_endpoint: 'https://auth.openai.com/revoke' }), { status: 200 });
      return new Response(JSON.stringify({ access_token: 'access-secret', refresh_token: 'refresh-secret', id_token: 'id-secret', token_type: 'Bearer', expires_in: 3600, scope: 'openid resource.invoke chatgpt.tokens.use.direct' }), { status: 200 });
    }));
    vi.mocked(jwtVerify).mockImplementation(async () => ({ payload: { nonce, sub: 'account-subject', email: 'user@example.com', name: 'User' }, protectedHeader: { alg: 'RS256' } }) as never);

    const oauth = new ChatGptOAuth(fixture.vault as never);
    const status = await oauth.signIn();
    expect(status).toMatchObject({ connected: true, planUsage: true, email: 'user@example.com' });
    expect(fixture.vault.set).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(status)).not.toContain('access-secret');
    expect(oauth.getStatus()).toEqual(status);
  });

  it('revokes a refresh token when possible and always deletes the local profile', async () => {
    const { ChatGptOAuth } = await import('./chatgpt-oauth');
    const profile = { issuer: 'https://auth.openai.com', subject: 'sub', clientId: 'oaiapp_test', hostId: 'urn:uuid:h', idToken: 'id', accessToken: 'access', refreshToken: 'refresh', tokenType: 'Bearer', expiresAt: '2030-01-01T00:00:00Z', scopes: ['openid'] };
    const fixture = vaultFixture({ 'chatgpt:oauth-profile:default': JSON.stringify(profile) });
    const fetchMock = vi.fn(async (rawUrl: string | URL) => String(rawUrl).includes('openid-configuration')
      ? new Response(JSON.stringify({ issuer: 'https://auth.openai.com', jwks_uri: 'https://auth.openai.com/jwks', revocation_endpoint: 'https://auth.openai.com/revoke' }), { status: 200 })
      : new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await new ChatGptOAuth(fixture.vault as never).signOut();
    expect(result).toEqual({ remoteRevoked: true });
    expect(fixture.vault.delete).toHaveBeenCalledWith('chatgpt:oauth-profile:default');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns a valid plan token and refreshes an expired token inside the encrypted vault', async () => {
    const { ChatGptOAuth } = await import('./chatgpt-oauth');
    const base = { issuer: 'https://auth.openai.com', subject: 'sub', clientId: 'oaiapp_test', hostId: 'urn:uuid:h', idToken: 'id', accessToken: 'old-access', refreshToken: 'refresh', tokenType: 'Bearer', scopes: ['resource.invoke', 'chatgpt.tokens.use.direct'] };
    const valid = vaultFixture({ 'chatgpt:oauth-profile:default': JSON.stringify({ ...base, expiresAt: '2035-01-01T00:00:00Z' }) });
    await expect(new ChatGptOAuth(valid.vault as never).getAccessToken()).resolves.toBe('old-access');

    const expired = vaultFixture({ 'chatgpt:oauth-profile:default': JSON.stringify({ ...base, expiresAt: '2020-01-01T00:00:00Z' }) });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600, scope: 'resource.invoke chatgpt.tokens.use.direct' }), { status: 200 })));
    const oauth = new ChatGptOAuth(expired.vault as never);
    await expect(oauth.getAccessToken()).resolves.toBe('new-access');
    expect(expired.vault.set).toHaveBeenCalledWith('chatgpt:oauth-profile:default', expect.stringContaining('new-access'));
  });

  it('fails closed when ChatGPT plan access or refresh is unavailable', async () => {
    const { ChatGptOAuth } = await import('./chatgpt-oauth');
    const disconnected = new ChatGptOAuth(vaultFixture().vault as never);
    await expect(disconnected.getAccessToken()).rejects.toThrow('not connected');
    const noRefresh = vaultFixture({ 'chatgpt:oauth-profile:default': JSON.stringify({ issuer: 'https://auth.openai.com', subject: 'sub', clientId: 'id', hostId: 'host', idToken: 'id', accessToken: 'old', tokenType: 'Bearer', expiresAt: '2020-01-01T00:00:00Z', scopes: ['resource.invoke', 'chatgpt.tokens.use.direct'] }) });
    await expect(new ChatGptOAuth(noRefresh.vault as never).getAccessToken()).rejects.toThrow('Sign in again');
  });

  it('fails closed on untrusted discovery metadata and malformed stored data', async () => {
    const { ChatGptOAuth } = await import('./chatgpt-oauth');
    const fixture = vaultFixture({ 'chatgpt:oauth-profile:default': '{broken' });
    const oauth = new ChatGptOAuth(fixture.vault as never);
    expect(oauth.getStatus()).toEqual({ connected: false, planUsage: false });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ issuer: 'https://evil.example', jwks_uri: 'https://evil.example/jwks' }), { status: 200 })));
    await expect((oauth as unknown as { discovery(): Promise<unknown> }).discovery()).rejects.toThrow('not trusted');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
    await expect((oauth as unknown as { discovery(): Promise<unknown> }).discovery()).rejects.toThrow('HTTP 500');
  });
});
