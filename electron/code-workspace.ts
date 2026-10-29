import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { CodeWorkspaceState, CommandResult, WorkspaceFile } from '../src/shared/api';

const IGNORED = new Set(['.git', 'node_modules', 'dist', 'release', 'coverage', '.next', '.cache']);
const MAX_FILES = 800;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT = 1_000_000;

export function resolveWorkspacePath(root: string, relative: string): string {
  if (!relative || path.isAbsolute(relative) || relative.includes('\0')) throw new Error('Invalid workspace path.');
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relative);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error('Path escapes the selected workspace.');
  return resolved;
}

function collect(root: string, current = root, files: string[] = []): string[] {
  if (files.length >= MAX_FILES) return files;
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
    if (IGNORED.has(entry.name)) continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) collect(root, absolute, files);
    else if (entry.isFile()) files.push(path.relative(root, absolute).replaceAll('\\', '/'));
    if (files.length >= MAX_FILES) break;
  }
  return files;
}

export class CodeWorkspaceService {
  constructor(private root?: string) {}

  setRoot(root: string): void {
    const resolved = path.resolve(root);
    if (!fs.statSync(resolved).isDirectory()) throw new Error('Selected workspace is not a directory.');
    this.root = resolved;
  }

  state(): CodeWorkspaceState {
    if (!this.root || !fs.existsSync(this.root)) return { files: [] };
    return { root: this.root, files: collect(this.root).sort((a, b) => a.localeCompare(b)) };
  }

  read(relative: string): WorkspaceFile {
    const absolute = this.path(relative);
    const stat = fs.statSync(absolute);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) throw new Error('File is unavailable or larger than 2 MB.');
    return { path: relative.replaceAll('\\', '/'), content: fs.readFileSync(absolute, 'utf8') };
  }

  save(file: WorkspaceFile): CodeWorkspaceState {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string' || Buffer.byteLength(file.content) > MAX_FILE_BYTES) throw new Error('Invalid workspace file.');
    const absolute = this.path(file.path);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, file.content, 'utf8');
    return this.state();
  }

  run(command: string): Promise<CommandResult> {
    const clean = typeof command === 'string' ? command.trim() : '';
    if (!clean || clean.length > 4000) throw new Error('Enter a valid command.');
    const cwd = this.requireRoot();
    return new Promise((resolve, reject) => {
      const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', clean], { cwd, windowsHide: true, shell: false, env: process.env });
      let stdout = ''; let stderr = ''; let timedOut = false;
      const append = (current: string, chunk: Buffer) => current.length >= MAX_OUTPUT ? current : current + chunk.toString('utf8').slice(0, MAX_OUTPUT - current.length);
      child.stdout.on('data', (chunk: Buffer) => { stdout = append(stdout, chunk); });
      child.stderr.on('data', (chunk: Buffer) => { stderr = append(stderr, chunk); });
      child.once('error', reject);
      const timer = setTimeout(() => { timedOut = true; child.kill(); }, 60_000);
      child.once('close', (exitCode) => { clearTimeout(timer); resolve({ command: clean, stdout, stderr, exitCode, timedOut }); });
    });
  }

  private requireRoot(): string {
    if (!this.root || !fs.existsSync(this.root)) throw new Error('Choose a workspace folder first.');
    return this.root;
  }

  private path(relative: string): string { return resolveWorkspacePath(this.requireRoot(), relative); }
}
