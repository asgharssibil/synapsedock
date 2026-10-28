import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkspaceDatabase } from './database';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('persistent workspace recovery', () => {
  it('recovers queued work and checkpoints after reopening the SQLite file', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'uaiw-test-'));
    temporaryDirectories.push(directory);
    const file = path.join(directory, 'workspace.sqlite');

    const first = await WorkspaceDatabase.open(file);
    first.createTask('Recovery task', 'Continue from the last valid checkpoint.', true);
    first.applyScenario('all-exhausted');
    expect(first.snapshot().stats.checkpoints).toBe(1);
    expect(first.snapshot().tasks[0].status).toBe('waiting-quota');

    const reopened = await WorkspaceDatabase.open(file);
    const snapshot = reopened.snapshot();
    expect(snapshot.tasks[0]).toMatchObject({ title: 'Recovery task', status: 'waiting-quota' });
    expect(snapshot.tasks[0].retryAt).toBeTruthy();
    expect(snapshot.stats.checkpoints).toBe(1);
  });

  it('TEST 4/6: requeues a waiting task after verified recovery and retains its checkpoint across restart', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'uaiw-recovery-'));
    temporaryDirectories.push(directory);
    const file = path.join(directory, 'workspace.sqlite');
    const first = await WorkspaceDatabase.open(file);
    first.createTask('Long project', 'Resume safely after quota reset.', true);
    first.applyScenario('all-exhausted');
    first.applyScenario('reset-recovered');

    const reopened = await WorkspaceDatabase.open(file);
    expect(reopened.snapshot().tasks[0].status).toBe('queued');
    expect(reopened.snapshot().stats.checkpoints).toBe(1);
  });

  it('TEST 5: persists an unknown email outcome and blocks duplicate reservation after restart', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'uaiw-operation-'));
    temporaryDirectories.push(directory);
    const file = path.join(directory, 'workspace.sqlite');
    const first = await WorkspaceDatabase.open(file);
    const task = first.createTask('Email follow-up', 'Send exactly once.', true);
    expect(first.reserveExternalOperation(task.id, 'email.send', 'sha256:request', 'email-001')).toBe('reserved');
    first.setExternalOperationState('email-001', 'unknown-outcome');

    const reopened = await WorkspaceDatabase.open(file);
    expect(reopened.getExternalOperationState('email-001')).toBe('unknown-outcome');
    expect(reopened.reserveExternalOperation(task.id, 'email.send', 'sha256:request', 'email-001')).toBe('blocked');
  });

  it('TEST 12: revokes an account without deleting persistent project work', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'uaiw-revoke-'));
    temporaryDirectories.push(directory);
    const file = path.join(directory, 'workspace.sqlite');
    const database = await WorkspaceDatabase.open(file);
    const task = database.createTask('Retained work', 'Keep this after provider revocation.', true);
    database.revokeAccount('mock-gpt');
    const snapshot = database.snapshot();
    expect(snapshot.accounts.find((account) => account.id === 'mock-gpt')).toMatchObject({ connected: false, availability: 'revoked' });
    expect(snapshot.tasks.find((item) => item.id === task.id)?.goal).toBe('Keep this after provider revocation.');
  });

  it('does not claim Ollama inference availability from model discovery alone', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'uaiw-ollama-'));
    temporaryDirectories.push(directory);
    const database = await WorkspaceDatabase.open(path.join(directory, 'workspace.sqlite'));
    database.markConnection('ollama', ['qwen3:8b']);
    expect(database.snapshot().accounts.find((account) => account.id === 'ollama-local')).toMatchObject({
      connected: true,
      availability: 'unknown',
      model: 'qwen3:8b',
    });
  });
});
