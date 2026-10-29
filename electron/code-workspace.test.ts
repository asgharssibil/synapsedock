import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CodeWorkspaceService, resolveWorkspacePath } from './code-workspace';

describe('code workspace service', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'synapsedock-workspace-'));
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'app.ts'), 'export const ready = false;');
    fs.mkdirSync(path.join(root, 'node_modules'));
    fs.writeFileSync(path.join(root, 'node_modules', 'ignored.js'), 'ignored');
  });
  afterEach(() => {
    if (root.startsWith(os.tmpdir()) && path.basename(root).startsWith('synapsedock-workspace-')) fs.rmSync(root, { recursive: true, force: true });
  });

  it('lists, reads and saves project files while ignoring dependency trees', () => {
    const workspace = new CodeWorkspaceService(root);
    expect(workspace.state().files).toEqual(['src/app.ts']);
    expect(workspace.read('src/app.ts').content).toContain('false');
    workspace.save({ path: 'src/app.ts', content: 'export const ready = true;' });
    expect(fs.readFileSync(path.join(root, 'src', 'app.ts'), 'utf8')).toContain('true');
  });

  it('creates nested files but blocks absolute and traversal paths', () => {
    const workspace = new CodeWorkspaceService(root);
    workspace.save({ path: 'src/features/new.ts', content: 'export {};' });
    expect(workspace.state().files).toContain('src/features/new.ts');
    expect(() => resolveWorkspacePath(root, '../outside.txt')).toThrow(/escapes/);
    expect(() => resolveWorkspacePath(root, path.resolve(root, 'absolute.txt'))).toThrow(/Invalid/);
  });

  it('runs a PowerShell command in the selected project and reports its exit state', async () => {
    const workspace = new CodeWorkspaceService(root);
    await expect(workspace.run('Write-Output SYNAPSEDOCK_OK')).resolves.toMatchObject({ stdout: expect.stringContaining('SYNAPSEDOCK_OK'), exitCode: 0, timedOut: false });
  });

  it('requires a valid selected directory', () => {
    const workspace = new CodeWorkspaceService();
    expect(workspace.state()).toEqual({ files: [] });
    expect(() => workspace.read('file.ts')).toThrow(/Choose a workspace/);
    expect(() => workspace.setRoot(path.join(root, 'missing'))).toThrow();
  });
});
