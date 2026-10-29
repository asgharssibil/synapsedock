import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { ClaudeCliStatus, ClaudeCliVerification } from '../src/shared/api';

type ProcessResult = { code: number | null; stdout: string; stderr: string; timedOut: boolean };
export type ClaudeProcessRunner = (executable: string, args: string[], options?: { timeoutMs?: number; cwd?: string; env?: NodeJS.ProcessEnv; detached?: boolean }) => Promise<ProcessResult>;

const OUTPUT_LIMIT = 1_000_000;
const SUBSCRIPTION_AUTH = new Set(['claude.ai', 'oauth_token']);

function appendLimited(current: string, chunk: Buffer): string {
  if (current.length >= OUTPUT_LIMIT) return current;
  return current + chunk.toString('utf8').slice(0, OUTPUT_LIMIT - current.length);
}

export const runClaudeProcess: ClaudeProcessRunner = (executable, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(executable, args, {
    cwd: options.cwd,
    env: options.env,
    detached: options.detached ?? false,
    windowsHide: !options.detached,
    shell: false,
    stdio: options.detached ? 'ignore' : ['ignore', 'pipe', 'pipe'],
  });
  if (options.detached) {
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolve({ code: 0, stdout: '', stderr: '', timedOut: false }); });
    return;
  }
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  child.stdout?.on('data', (chunk: Buffer) => { stdout = appendLimited(stdout, chunk); });
  child.stderr?.on('data', (chunk: Buffer) => { stderr = appendLimited(stderr, chunk); });
  child.once('error', reject);
  const timer = setTimeout(() => { timedOut = true; child.kill(); }, options.timeoutMs ?? 15_000);
  child.once('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut }); });
});

export function parseAuthStatus(stdout: string): Pick<ClaudeCliStatus, 'loggedIn' | 'authMethod'> {
  try {
    const parsed = JSON.parse(stdout) as { loggedIn?: unknown; authMethod?: unknown };
    const method = typeof parsed.authMethod === 'string' ? parsed.authMethod : 'unknown';
    const allowed = ['none', 'claude.ai', 'oauth_token', 'api_key', 'api_key_helper', 'third_party'];
    return { loggedIn: parsed.loggedIn === true, authMethod: (allowed.includes(method) ? method : 'unknown') as ClaudeCliStatus['authMethod'] };
  } catch {
    return { loggedIn: false, authMethod: 'unknown' };
  }
}

function subscriptionEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  return env;
}

function responseText(stdout: string): string | undefined {
  try {
    const parsed = JSON.parse(stdout) as { result?: unknown; is_error?: unknown };
    if (parsed.is_error === true || typeof parsed.result !== 'string') return undefined;
    return parsed.result.slice(0, 500);
  } catch { return undefined; }
}

export class ClaudeCliAdapter {
  constructor(
    private readonly workingDirectory: string,
    private readonly runner: ClaudeProcessRunner = runClaudeProcess,
    private readonly configuredExecutable?: string,
  ) {}

  private async executable(): Promise<string | undefined> {
    if (this.configuredExecutable) return this.configuredExecutable;
    const local = process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.local', 'bin', 'claude.exe') : undefined;
    if (local && fs.existsSync(local)) return local;
    const where = await this.runner('where.exe', ['claude.exe'], { timeoutMs: 4_000 }).catch(() => undefined);
    return where?.stdout.split(/\r?\n/).map((item) => item.trim()).find((item) => path.isAbsolute(item) && item.toLowerCase().endsWith('.exe') && fs.existsSync(item));
  }

  async status(enabled: boolean): Promise<ClaudeCliStatus> {
    const executable = await this.executable();
    if (!executable) return { enabled, installed: false, loggedIn: false, detail: 'Claude Code native executable was not found.' };
    const [version, auth] = await Promise.all([
      this.runner(executable, ['--version'], { timeoutMs: 8_000, cwd: this.workingDirectory }),
      this.runner(executable, ['auth', 'status'], { timeoutMs: 8_000, cwd: this.workingDirectory }),
    ]);
    const parsed = parseAuthStatus(auth.stdout);
    return {
      enabled, installed: true, executable, version: version.stdout.trim().slice(0, 80), ...parsed,
      detail: auth.code === 0 ? undefined : 'Claude Code is installed but not signed in.',
    };
  }

  async launchLogin(): Promise<{ launched: boolean; message: string }> {
    const executable = await this.executable();
    if (!executable) return { launched: false, message: 'Claude Code is not installed. Install the official CLI first.' };
    await this.runner(executable, ['auth', 'login'], { cwd: this.workingDirectory, detached: true });
    return { launched: true, message: 'Claude Code login opened. Enter email, password, and 2FA only on the official Claude page.' };
  }

  async verify(): Promise<ClaudeCliVerification & { version?: string; authMethod?: string }> {
    const status = await this.status(true);
    if (!status.installed) return { ok: false, message: 'Claude Code is not installed.' };
    if (!status.loggedIn) return { ok: false, message: 'Sign in with Claude Code before verification.' };
    if (!status.authMethod || !SUBSCRIPTION_AUTH.has(status.authMethod)) {
      return { ok: false, message: `Verification stopped: authentication method “${status.authMethod ?? 'unknown'}” is not a Claude subscription login. This prevents accidental API billing.` };
    }
    const result = await this.runner(status.executable!, [
      '--safe-mode', '-p', 'Reply with exactly: SYNAPSEDOCK_CLAUDE_OK',
      '--tools', '', '--disallowedTools', 'mcp__*', '--disable-slash-commands',
      '--no-session-persistence', '--permission-mode', 'dontAsk', '--max-turns', '1', '--output-format', 'json',
    ], { timeoutMs: 120_000, cwd: this.workingDirectory, env: subscriptionEnvironment() });
    if (result.timedOut) return { ok: false, message: 'Claude verification timed out.' };
    const response = responseText(result.stdout);
    const ok = result.code === 0 && response?.trim() === 'SYNAPSEDOCK_CLAUDE_OK';
    return {
      ok, response, version: status.version, authMethod: status.authMethod,
      message: ok ? 'Claude subscription inference verified through the official Claude Code CLI.' : `Claude verification failed${result.stderr.trim() ? `: ${result.stderr.trim().slice(0, 240)}` : '.'}`,
    };
  }
}
