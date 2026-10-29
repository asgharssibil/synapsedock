import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { type Database as SqlDatabase } from 'sql.js';
import type { ProviderAccount, WorkspaceTask } from '../src/core/types';
import { PROVIDER_CATALOG, providerCatalogItem, type CloudProviderId } from '../src/core/provider-catalog';
import type { ActivityItem, WorkspaceSnapshot } from '../src/shared/api';

export class WorkspaceDatabase {
  private constructor(private readonly db: SqlDatabase, private readonly filePath: string) {}

  static async open(filePath: string): Promise<WorkspaceDatabase> {
    const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
    const bytes = fs.existsSync(filePath) ? fs.readFileSync(filePath) : undefined;
    const instance = new WorkspaceDatabase(new SQL.Database(bytes), filePath);
    instance.migrate();
    instance.seed();
    instance.ensureProviderCatalog();
    instance.persist();
    return instance;
  }

  private migrate(): void {
    this.db.run(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS provider_accounts (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL, display_name TEXT NOT NULL, plan TEXT NOT NULL,
        model TEXT NOT NULL, connection_method TEXT NOT NULL, availability TEXT NOT NULL,
        connected INTEGER NOT NULL, capabilities_json TEXT NOT NULL, quota_windows_json TEXT NOT NULL,
        paid INTEGER NOT NULL, priority INTEGER NOT NULL, current_task TEXT, updated_at TEXT, simulation INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, goal TEXT NOT NULL, status TEXT NOT NULL,
        provider_account_id TEXT, free_only INTEGER NOT NULL, retry_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY, task_id TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id)
      );
      CREATE TABLE IF NOT EXISTS external_operations (
        idempotency_key TEXT PRIMARY KEY, task_id TEXT NOT NULL, kind TEXT NOT NULL, state TEXT NOT NULL,
        request_hash TEXT NOT NULL, remote_reference TEXT, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY, level TEXT NOT NULL, event TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL);
    `);
  }

  private seed(): void {
    const count = this.scalar('SELECT COUNT(*) FROM provider_accounts');
    if (count > 0) return;
    const now = new Date().toISOString();
    const accounts: ProviderAccount[] = [
      {
        id: 'mock-gpt', provider: 'mock', displayName: 'GPT Simulation', plan: 'Test fixture', model: 'mock-gpt-code',
        connectionMethod: 'mock-simulation', availability: 'available', connected: true,
        capabilities: ['chat', 'code', 'tools', 'streaming'],
        quotaWindows: [{ kind: 'five-hour', usedPercent: 72, source: 'mock-simulation', confidence: 'verified', resetAt: new Date(Date.now() + 3_600_000).toISOString() }],
        paid: false, priority: 1, lastUpdatedAt: now, simulation: true,
      },
      {
        id: 'mock-claude', provider: 'mock', displayName: 'Claude Simulation', plan: 'Test fixture', model: 'mock-claude-code',
        connectionMethod: 'mock-simulation', availability: 'available', connected: true,
        capabilities: ['chat', 'code', 'files', 'tools', 'streaming'],
        quotaWindows: [{ kind: 'weekly', usedPercent: 41, source: 'mock-simulation', confidence: 'verified', resetAt: new Date(Date.now() + 86_400_000).toISOString() }],
        paid: false, priority: 2, lastUpdatedAt: now, simulation: true,
      },
      {
        id: 'ollama-local', provider: 'ollama', displayName: 'Ollama Local', plan: 'Local runtime', model: 'Discover on connect',
        connectionMethod: 'local-runtime', availability: 'unknown', connected: false,
        capabilities: ['chat', 'code', 'streaming', 'local'], quotaWindows: [{ kind: 'rate', source: 'local-runtime', confidence: 'unknown' }],
        paid: false, priority: 3, lastUpdatedAt: now, simulation: false,
      },
      {
        id: 'openai-api', provider: 'openai', displayName: 'OpenAI API', plan: 'Not configured', model: 'Discover on connect',
        connectionMethod: 'official-api', availability: 'unknown', connected: false,
        capabilities: ['chat', 'code', 'vision', 'files', 'tools', 'streaming'], quotaWindows: [{ kind: 'credit', source: 'unknown', confidence: 'unknown' }],
        paid: true, priority: 4, lastUpdatedAt: now, simulation: false,
      },
      {
        id: 'google-api', provider: 'google', displayName: 'Gemini API', plan: 'Not configured', model: 'Discover on connect',
        connectionMethod: 'official-api', availability: 'unknown', connected: false,
        capabilities: ['chat', 'code', 'vision', 'files', 'tools', 'streaming'], quotaWindows: [{ kind: 'rate', source: 'unknown', confidence: 'unknown' }],
        paid: false, priority: 5, lastUpdatedAt: now, simulation: false,
      },
      {
        id: 'xai-api', provider: 'xai', displayName: 'xAI API', plan: 'Not configured', model: 'Discover on connect',
        connectionMethod: 'official-api', availability: 'unknown', connected: false,
        capabilities: ['chat', 'code', 'vision', 'tools', 'streaming'], quotaWindows: [{ kind: 'rate', source: 'unknown', confidence: 'unknown' }],
        paid: true, priority: 6, lastUpdatedAt: now, simulation: false,
      },
      {
        id: 'anthropic-api', provider: 'anthropic', displayName: 'Anthropic API', plan: 'Adapter planned', model: 'Unavailable in this build',
        connectionMethod: 'official-api', availability: 'unknown', connected: false,
        capabilities: ['chat', 'code', 'vision', 'files', 'tools', 'streaming'], quotaWindows: [{ kind: 'rate', source: 'unknown', confidence: 'unknown' }],
        paid: true, priority: 7, lastUpdatedAt: now, simulation: false,
      },
    ];
    accounts.forEach((account) => this.upsertAccount(account));
    this.addActivity('info', 'workspace.created', 'Local workspace database initialized.');
    this.addActivity('warning', 'simulation.enabled', 'Mock providers are test fixtures and are not real service connections.');
  }

  private ensureProviderCatalog(): void {
    const now = new Date().toISOString();
    PROVIDER_CATALOG.forEach((provider, index) => {
      const id = `${provider.id}-api`;
      if (this.value<number>(`SELECT COUNT(*) FROM provider_accounts WHERE id = ${this.quote(id)}`)) return;
      this.upsertAccount({
        id, provider: provider.id, displayName: provider.name, plan: 'Not configured', model: 'Discover on connect',
        connectionMethod: 'official-api', availability: 'unknown', connected: false, capabilities: provider.capabilities,
        quotaWindows: [{ kind: 'rate', source: 'unknown', confidence: 'unknown' }], paid: provider.freeTier === 'paid',
        priority: 10 + index, lastUpdatedAt: now, simulation: false,
      });
    });
  }

  snapshot(): WorkspaceSnapshot {
    const accounts = this.queryAccounts();
    const tasks = this.queryTasks();
    const activities = this.query<ActivityItem>('SELECT id, level, event, message, created_at as createdAt FROM activity_log ORDER BY created_at DESC LIMIT 12');
    return {
      accounts, tasks, activities,
      stats: {
        running: tasks.filter((task) => task.status === 'running').length,
        waiting: tasks.filter((task) => task.status === 'waiting-quota').length,
        connected: accounts.filter((account) => account.connected && !account.simulation).length,
        checkpoints: this.scalar('SELECT COUNT(*) FROM checkpoints'),
      },
    };
  }

  createTask(title: string, goal: string, freeOnly: boolean): WorkspaceTask {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.run('INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, title, goal, 'queued', null, freeOnly ? 1 : 0, null, now, now]);
    this.addActivity('info', 'task.queued', `Task queued: ${title}`);
    this.persist();
    return { id, title, goal, status: 'queued', createdAt: now, updatedAt: now };
  }

  applyScenario(scenario: string): void {
    const now = new Date().toISOString();
    if (scenario === 'gpt-90') {
      this.updateMockQuota('mock-gpt', 'available', 90, new Date(Date.now() + 3_600_000).toISOString());
      this.addActivity('warning', 'quota.prepare', 'GPT simulation reached 90%; checkpoint preparation requested.');
    } else if (scenario === 'claude-exhausted') {
      this.updateMockQuota('mock-claude', 'exhausted', 100, new Date(Date.now() + 7_200_000).toISOString());
      this.createCheckpointForLatestTask('Claude simulation exhausted; state persisted before failover.');
      this.addActivity('warning', 'provider.failover', 'Claude simulation exhausted; next compatible provider is required.');
    } else if (scenario === 'all-exhausted') {
      this.updateMockQuota('mock-gpt', 'exhausted', 100, new Date(Date.now() + 3_600_000).toISOString());
      this.updateMockQuota('mock-claude', 'reset-pending', 100, new Date(Date.now() + 7_200_000).toISOString());
      this.db.run("UPDATE tasks SET status = 'waiting-quota', retry_at = ?, updated_at = ? WHERE id = (SELECT id FROM tasks ORDER BY created_at DESC LIMIT 1)", [new Date(Date.now() + 3_600_000).toISOString(), now]);
      this.createCheckpointForLatestTask('All compatible simulated providers exhausted.');
      this.addActivity('warning', 'task.waiting-quota', 'All simulated providers exhausted; task persisted for verified retry.');
    } else if (scenario === 'reset-recovered') {
      this.updateMockQuota('mock-gpt', 'available', 0, new Date(Date.now() + 18_000_000).toISOString());
      this.db.run("UPDATE tasks SET status = 'queued', retry_at = NULL, updated_at = ? WHERE status = 'waiting-quota'", [now]);
      this.addActivity('success', 'quota.recovered', 'GPT simulation access was re-verified; waiting tasks returned to the queue.');
    }
    this.persist();
  }

  markConnection(provider: CloudProviderId | 'ollama', models: string[]): void {
    const id = provider === 'ollama' ? 'ollama-local' : `${provider}-api`;
    this.db.run(
      "UPDATE provider_accounts SET connected = 1, availability = ?, plan = ?, model = ?, updated_at = ? WHERE id = ?",
      ['unknown', provider === 'ollama' ? 'Local runtime discovered' : 'Official API configured', models.slice(0, 3).join(', ') || 'Discovered', new Date().toISOString(), id],
    );
    const label = provider === 'ollama' ? 'Ollama' : providerCatalogItem(provider).name;
    this.addActivity('success', 'provider.connected', provider === 'ollama' ? 'Ollama runtime and models discovered; inference not yet verified.' : `${label} credential accepted by an official read-only endpoint; generation not yet tested.`);
    this.persist();
  }

  markChatGptConnection(label: string, planUsage: boolean): void {
    this.upsertAccount({
      id: 'chatgpt-subscription', provider: 'openai', displayName: label, plan: planUsage ? 'ChatGPT plan connected' : 'Identity connected',
      model: planUsage ? 'Discover after authorized request' : 'Plan usage not authorized', connectionMethod: 'official-subscription',
      availability: planUsage ? 'available' : 'limited', connected: true, capabilities: ['chat', 'code', 'files', 'tools', 'streaming'],
      quotaWindows: [{ kind: 'five-hour', source: 'official-api', confidence: 'unknown' }], paid: false, priority: 3,
      lastUpdatedAt: new Date().toISOString(), simulation: false,
    });
    this.addActivity('success', 'provider.subscription-connected', `ChatGPT account connected through official OAuth${planUsage ? ' with plan usage permission' : ''}.`);
    this.persist();
  }

  disconnectChatGpt(): void {
    this.db.run("UPDATE provider_accounts SET connected = 0, availability = 'revoked', updated_at = ? WHERE id = 'chatgpt-subscription'", [new Date().toISOString()]);
    this.addActivity('warning', 'provider.subscription-disconnected', 'ChatGPT account disconnected from SynapseDock.');
    this.persist();
  }

  getBooleanSetting(key: string, fallback = false): boolean {
    const value = this.value<string>(`SELECT value_json FROM settings WHERE key = ${this.quote(key)}`);
    if (value === undefined) return fallback;
    try { return JSON.parse(value) === true; }
    catch { return fallback; }
  }

  setBooleanSetting(key: string, value: boolean): void {
    this.db.run('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)', [key, JSON.stringify(value)]);
    this.persist();
  }

  getStringSetting(key: string): string | undefined {
    const value = this.value<string>(`SELECT value_json FROM settings WHERE key = ${this.quote(key)}`);
    if (!value) return undefined;
    try { const parsed = JSON.parse(value); return typeof parsed === 'string' ? parsed : undefined; }
    catch { return undefined; }
  }

  setStringSetting(key: string, value: string): void {
    this.db.run('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)', [key, JSON.stringify(value)]);
    this.persist();
  }

  markClaudeCliConnection(version: string, authMethod: string): void {
    this.upsertAccount({
      id: 'claude-cli-subscription', provider: 'anthropic', displayName: 'Claude via Claude Code',
      plan: 'Experimental bridge to official CLI', model: `Claude Code ${version}`, connectionMethod: 'official-cli',
      availability: 'available', connected: true, capabilities: ['chat', 'code'],
      quotaWindows: [{ kind: 'weekly', source: 'official-cli', confidence: 'unknown' }], paid: true, priority: 4,
      lastUpdatedAt: new Date().toISOString(), simulation: false,
    });
    this.addActivity('success', 'provider.experimental-cli-verified', `Claude Code connection verified through ${authMethod}; quota remains unknown.`);
    this.persist();
  }

  disconnectClaudeCli(): void {
    this.db.run("UPDATE provider_accounts SET connected = 0, availability = 'revoked', updated_at = ? WHERE id = 'claude-cli-subscription'", [new Date().toISOString()]);
    this.addActivity('warning', 'provider.experimental-cli-disabled', 'Experimental Claude Code bridge disabled. Claude Code login was not changed.');
    this.persist();
  }

  reserveExternalOperation(taskId: string, kind: string, requestHash: string, idempotencyKey: string): 'reserved' | 'blocked' {
    const existing = this.value<string>('SELECT state FROM external_operations WHERE idempotency_key = ' + this.quote(idempotencyKey));
    if (existing && existing !== 'failed-safe-to-retry') return 'blocked';
    const now = new Date().toISOString();
    this.db.run(
      'INSERT OR REPLACE INTO external_operations VALUES (?, ?, ?, ?, ?, ?, ?)',
      [idempotencyKey, taskId, kind, 'reserved', requestHash, null, now],
    );
    this.persist();
    return 'reserved';
  }

  setExternalOperationState(idempotencyKey: string, state: 'unknown-outcome' | 'succeeded' | 'failed-safe-to-retry', remoteReference?: string): void {
    this.db.run('UPDATE external_operations SET state = ?, remote_reference = ?, updated_at = ? WHERE idempotency_key = ?', [state, remoteReference ?? null, new Date().toISOString(), idempotencyKey]);
    this.persist();
  }

  getExternalOperationState(idempotencyKey: string): string | undefined {
    return this.value<string>('SELECT state FROM external_operations WHERE idempotency_key = ' + this.quote(idempotencyKey));
  }

  revokeAccount(accountId: string): void {
    this.db.run("UPDATE provider_accounts SET connected = 0, availability = 'revoked', updated_at = ? WHERE id = ?", [new Date().toISOString(), accountId]);
    this.addActivity('warning', 'provider.revoked', `Access revoked for ${accountId}; project data was retained.`);
    this.persist();
  }

  private updateMockQuota(id: string, availability: string, usedPercent: number, resetAt: string): void {
    const kind = id === 'mock-gpt' ? 'five-hour' : 'weekly';
    const windows = JSON.stringify([{ kind, usedPercent, resetAt, source: 'mock-simulation', confidence: 'verified' }]);
    this.db.run('UPDATE provider_accounts SET availability = ?, quota_windows_json = ?, updated_at = ? WHERE id = ?', [availability, windows, new Date().toISOString(), id]);
  }

  private createCheckpointForLatestTask(reason: string): void {
    const taskId = this.value<string>('SELECT id FROM tasks ORDER BY created_at DESC LIMIT 1');
    if (!taskId) return;
    this.db.run('INSERT INTO checkpoints VALUES (?, ?, ?, ?)', [crypto.randomUUID(), taskId, JSON.stringify({ reason, schemaVersion: 1 }), new Date().toISOString()]);
  }

  private upsertAccount(account: ProviderAccount): void {
    this.db.run('INSERT OR REPLACE INTO provider_accounts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      account.id, account.provider, account.displayName, account.plan, account.model, account.connectionMethod,
      account.availability, account.connected ? 1 : 0, JSON.stringify(account.capabilities), JSON.stringify(account.quotaWindows),
      account.paid ? 1 : 0, account.priority, account.currentTask ?? null, account.lastUpdatedAt ?? null, account.simulation ? 1 : 0,
    ]);
  }

  private queryAccounts(): ProviderAccount[] {
    return this.query<Record<string, unknown>>('SELECT * FROM provider_accounts ORDER BY priority').map((row) => ({
      id: String(row.id), provider: row.provider as ProviderAccount['provider'], displayName: String(row.display_name), plan: String(row.plan),
      model: String(row.model), connectionMethod: row.connection_method as ProviderAccount['connectionMethod'],
      availability: row.availability as ProviderAccount['availability'], connected: Boolean(row.connected),
      capabilities: JSON.parse(String(row.capabilities_json)), quotaWindows: JSON.parse(String(row.quota_windows_json)),
      paid: Boolean(row.paid), priority: Number(row.priority), currentTask: row.current_task ? String(row.current_task) : undefined,
      lastUpdatedAt: row.updated_at ? String(row.updated_at) : undefined, simulation: Boolean(row.simulation),
    }));
  }

  private queryTasks(): WorkspaceTask[] {
    return this.query<Record<string, unknown>>('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 20').map((row) => ({
      id: String(row.id), title: String(row.title), goal: String(row.goal), status: row.status as WorkspaceTask['status'],
      providerAccountId: row.provider_account_id ? String(row.provider_account_id) : undefined,
      retryAt: row.retry_at ? String(row.retry_at) : undefined, createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    }));
  }

  private addActivity(level: ActivityItem['level'], event: string, message: string): void {
    this.db.run('INSERT INTO activity_log VALUES (?, ?, ?, ?, ?)', [crypto.randomUUID(), level, event, message, new Date().toISOString()]);
  }

  private scalar(sql: string): number { return Number(this.value<number>(sql) ?? 0); }
  private quote(value: string): string { return `'${value.replaceAll("'", "''")}'`; }
  private value<T>(sql: string): T | undefined {
    const row = this.query<Record<string, T>>(sql)[0];
    return row?.[Object.keys(row)[0]];
  }
  private query<T>(sql: string): T[] {
    const statement = this.db.prepare(sql);
    const rows: T[] = [];
    while (statement.step()) rows.push(statement.getAsObject() as T);
    statement.free();
    return rows;
  }
  private persist(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, Buffer.from(this.db.export()));
  }
}
