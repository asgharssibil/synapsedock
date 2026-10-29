import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClaudeCliAdapter, parseAuthStatus, runClaudeProcess, type ClaudeProcessRunner } from './claude-cli';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('experimental Claude Code bridge', () => {
  it('parses only public authentication status fields', () => {
    expect(parseAuthStatus('{"loggedIn":true,"authMethod":"claude.ai","token":"secret"}')).toEqual({ loggedIn: true, authMethod: 'claude.ai' });
    expect(parseAuthStatus('not json')).toEqual({ loggedIn: false, authMethod: 'unknown' });
  });

  it('uses a locked-down one-turn verification without exposing credentials', async () => {
    const runner = vi.fn<ClaudeProcessRunner>(async (_executable, args) => {
      if (args[0] === '--version') return { code: 0, stdout: '2.1.300', stderr: '', timedOut: false };
      if (args[0] === 'auth') return { code: 0, stdout: '{"loggedIn":true,"authMethod":"claude.ai"}', stderr: '', timedOut: false };
      return { code: 0, stdout: '{"result":"SYNAPSEDOCK_CLAUDE_OK","is_error":false}', stderr: '', timedOut: false };
    });
    const adapter = new ClaudeCliAdapter(process.cwd(), runner, 'C:\\fake\\claude.exe');
    const result = await adapter.verify();
    const verifyCall = runner.mock.calls.find((call) => call[1][0] === '--safe-mode')!;
    expect(result.ok).toBe(true);
    expect(verifyCall[1]).toEqual(expect.arrayContaining(['--safe-mode', '--tools', '', '--disallowedTools', 'mcp__*', '--no-session-persistence', '--max-turns', '1']));
    expect(verifyCall[2]?.env?.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it('refuses to verify when Claude Code is using API billing', async () => {
    const runner = vi.fn<ClaudeProcessRunner>(async (_executable, args) => args[0] === '--version'
      ? { code: 0, stdout: '2.1.300', stderr: '', timedOut: false }
      : { code: 0, stdout: '{"loggedIn":true,"authMethod":"api_key"}', stderr: '', timedOut: false });
    const result = await new ClaudeCliAdapter(process.cwd(), runner, 'C:\\fake\\claude.exe').verify();
    expect(result).toMatchObject({ ok: false });
    expect(result.message).toContain('prevents accidental API billing');
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it('reports missing and signed-out CLI states without reading credential files', async () => {
    vi.stubEnv('USERPROFILE', 'C:\\definitely-missing-profile');
    const missingRunner = vi.fn<ClaudeProcessRunner>().mockResolvedValue({ code: 1, stdout: '', stderr: '', timedOut: false });
    await expect(new ClaudeCliAdapter(process.cwd(), missingRunner).status(false)).resolves.toMatchObject({ enabled: false, installed: false, loggedIn: false });
    await expect(new ClaudeCliAdapter(process.cwd(), missingRunner).launchLogin()).resolves.toMatchObject({ launched: false });

    const signedOutRunner = vi.fn<ClaudeProcessRunner>(async (_executable, args) => args[0] === '--version'
      ? { code: 0, stdout: '2.1.221\n', stderr: '', timedOut: false }
      : { code: 1, stdout: '{"loggedIn":false,"authMethod":"none"}', stderr: 'signed out', timedOut: false });
    const status = await new ClaudeCliAdapter(process.cwd(), signedOutRunner, 'C:\\fake\\claude.exe').status(true);
    expect(status).toMatchObject({ enabled: true, installed: true, loggedIn: false, version: '2.1.221', detail: 'Claude Code is installed but not signed in.' });
    await expect(new ClaudeCliAdapter(process.cwd(), signedOutRunner, 'C:\\fake\\claude.exe').verify()).resolves.toMatchObject({ ok: false, message: 'Sign in with Claude Code before verification.' });
  });

  it('launches official CLI login detached and handles timeout or malformed verification output', async () => {
    const runner = vi.fn<ClaudeProcessRunner>(async (_executable, args, options) => {
      if (args[0] === 'auth' && args[1] === 'login') return { code: 0, stdout: '', stderr: '', timedOut: false };
      if (args[0] === '--version') return { code: 0, stdout: '2.1.300', stderr: '', timedOut: false };
      if (args[0] === 'auth') return { code: 0, stdout: '{"loggedIn":true,"authMethod":"oauth_token"}', stderr: '', timedOut: false };
      return { code: 1, stdout: 'not-json', stderr: options?.timeoutMs ? 'failed safely' : '', timedOut: true };
    });
    const adapter = new ClaudeCliAdapter(process.cwd(), runner, 'C:\\fake\\claude.exe');
    await expect(adapter.launchLogin()).resolves.toMatchObject({ launched: true });
    expect(runner.mock.calls[0][2]?.detached).toBe(true);
    await expect(adapter.verify()).resolves.toEqual({ ok: false, message: 'Claude verification timed out.' });
  });

  it('returns a real one-turn chat response through a subscription login', async () => {
    const runner = vi.fn<ClaudeProcessRunner>(async (_executable, args) => {
      if (args[0] === '--version') return { code: 0, stdout: '2.1.300', stderr: '', timedOut: false };
      if (args[0] === 'auth') return { code: 0, stdout: '{"loggedIn":true,"authMethod":"claude.ai"}', stderr: '', timedOut: false };
      return { code: 0, stdout: '{"result":"Working answer","is_error":false}', stderr: '', timedOut: false };
    });
    const adapter = new ClaudeCliAdapter(process.cwd(), runner, 'C:\\fake\\claude.exe');
    await expect(adapter.chat([{ role: 'user', content: 'Help me code' }])).resolves.toBe('Working answer');
    const chatCall = runner.mock.calls.find((call) => call[1][0] === '--safe-mode')!;
    expect(chatCall[1]).toEqual(expect.arrayContaining(['--tools', '', '--no-session-persistence']));
  });

  it('runs subprocesses without a shell and enforces their timeout', async () => {
    const success = await runClaudeProcess(process.execPath, ['-e', 'process.stdout.write("ok")'], { timeoutMs: 5_000 });
    expect(success).toMatchObject({ code: 0, stdout: 'ok', timedOut: false });
    const timed = await runClaudeProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { timeoutMs: 30 });
    expect(timed.timedOut).toBe(true);
  });
});
