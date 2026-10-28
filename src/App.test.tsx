// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { DesktopApi, WorkspaceSnapshot } from './shared/api';

const initialSnapshot: WorkspaceSnapshot = {
  accounts: [{
    id: 'mock-gpt', provider: 'mock', displayName: 'GPT Simulation', plan: 'Test fixture', model: 'mock-gpt',
    connectionMethod: 'mock-simulation', availability: 'available', connected: true,
    capabilities: ['chat', 'code', 'tools', 'streaming'],
    quotaWindows: [{ kind: 'five-hour', usedPercent: 72, source: 'mock-simulation', confidence: 'verified', resetAt: '2030-01-01T00:00:00Z' }],
    paid: false, priority: 1, simulation: true,
  }, {
    id: 'openai-api', provider: 'openai', displayName: 'OpenAI API', plan: 'Not configured', model: 'Discover on connect',
    connectionMethod: 'official-api', availability: 'unknown', connected: false,
    capabilities: ['chat', 'code', 'tools', 'streaming'], quotaWindows: [{ kind: 'credit', source: 'unknown', confidence: 'unknown' }],
    paid: true, priority: 2, simulation: false,
  }],
  tasks: [], activities: [{ id: 'activity-1', level: 'info', event: 'test', message: 'Workspace loaded.', createdAt: new Date().toISOString() }],
  stats: { running: 0, waiting: 0, connected: 0, checkpoints: 0 },
};

let desktop: { [K in keyof DesktopApi]: ReturnType<typeof vi.fn> };

beforeEach(() => {
  localStorage.clear();
  desktop = {
    getSnapshot: vi.fn().mockResolvedValue(initialSnapshot),
    createTask: vi.fn(), runScenario: vi.fn(), testConnection: vi.fn(), testOllama: vi.fn(), getRuntimeInfo: vi.fn(),
  };
  Object.defineProperty(window, 'desktop', { configurable: true, value: desktop });
});

afterEach(() => cleanup());

describe('desktop renderer user flows', () => {
  it('renders the persisted dashboard and clearly labels mock providers', async () => {
    render(<App />);
    expect(await screen.findByText('سلام، آمادهٔ ادامه‌ایم')).toBeTruthy();
    expect(screen.getAllByText('GPT Simulation').length).toBeGreaterThan(0);
    expect(screen.getByText(/فقط Mock هستند/)).toBeTruthy();
  });

  it('navigates to official connections without exposing a credential value', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('سلام، آمادهٔ ادامه‌ایم');
    await user.click(screen.getByRole('button', { name: 'اتصال‌ها' }));
    expect(screen.getByText('اتصال‌های رسمی')).toBeTruthy();
    const keyInput = screen.getByLabelText('کلید API') as HTMLInputElement;
    expect(keyInput.type).toBe('password');
    expect(keyInput.value).toBe('');
  });

  it('creates a free-only persistent task through the modal and shows it in the queue', async () => {
    const user = userEvent.setup();
    const created: WorkspaceSnapshot = {
      ...initialSnapshot,
      tasks: [{ id: 'task-1', title: 'پروژه آزمایشی', goal: 'ادامه از checkpoint', status: 'queued', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
    };
    desktop.createTask.mockResolvedValue(created);
    render(<App />);
    await screen.findByText('سلام، آمادهٔ ادامه‌ایم');
    await user.click(screen.getByRole('button', { name: 'وظیفهٔ جدید' }));
    await user.type(screen.getByLabelText('عنوان'), 'پروژه آزمایشی');
    await user.type(screen.getByLabelText('هدف و معیار پایان'), 'ادامه از checkpoint');
    await user.click(screen.getByRole('button', { name: 'ساخت وظیفه' }));
    expect(desktop.createTask).toHaveBeenCalledWith({ title: 'پروژه آزمایشی', goal: 'ادامه از checkpoint', freeOnly: true });
    expect(await screen.findByText('پروژه آزمایشی')).toBeTruthy();
  });

  it('switches the interface from RTL Persian to LTR English', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('سلام، آمادهٔ ادامه‌ایم');
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(await screen.findByText('Welcome back')).toBeTruthy();
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('keeps settings visible and persists language and theme choices', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('سلام، آمادهٔ ادامه‌ایم');
    await user.click(screen.getByRole('button', { name: 'تنظیمات' }));
    expect(screen.getByRole('heading', { name: 'تنظیمات' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /English/ }));
    await user.click(screen.getByRole('button', { name: /Light/ }));
    expect(localStorage.getItem('synapsedock.locale')).toBe('en');
    expect(localStorage.getItem('synapsedock.theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('provides a persistent local coding scratchpad', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('سلام، آمادهٔ ادامه‌ایم');
    await user.click(screen.getByRole('button', { name: 'فضای کدنویسی' }));
    const editor = screen.getByLabelText('ویرایشگر کد');
    await user.clear(editor);
    await user.type(editor, 'const ready = true;');
    await user.click(screen.getByRole('button', { name: /ذخیره محلی/ }));
    expect(localStorage.getItem('synapsedock.code.draft')).toBe('const ready = true;');
  });
});
