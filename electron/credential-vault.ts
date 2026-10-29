import fs from 'node:fs';
import path from 'node:path';
import { safeStorage } from 'electron';

export class CredentialVault {
  constructor(private readonly filePath: string) {}

  async set(key: string, secret: string): Promise<void> {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) throw new Error('OS credential encryption is unavailable.');
    const values = this.readAll();
    values[key] = (await safeStorage.encryptStringAsync(secret)).toString('base64');
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(values), { encoding: 'utf8', mode: 0o600 });
  }

  get(key: string): string | undefined {
    const encrypted = this.readAll()[key];
    if (!encrypted) return undefined;
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
  }

  delete(key: string): void {
    const values = this.readAll();
    if (!(key in values)) return;
    delete values[key];
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(values), { encoding: 'utf8', mode: 0o600 });
  }

  private readAll(): Record<string, string> {
    if (!fs.existsSync(this.filePath)) return {};
    try { return JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Record<string, string>; }
    catch { return {}; }
  }
}
