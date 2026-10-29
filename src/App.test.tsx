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
    getSnapshot: vi.fn().mockResolvedValue(initialSnapshot), getChatGptStatus: vi.fn().mockResolvedValue({ connected: false, planUsage: false }),
    getClaudeCliStatus: vi.fn().mockResolvedValue({ enabled: false, installed: true, loggedIn: false, version: '2.1.300' }),
    createTask: vi.fn(), runScenario: vi.fn(), testConnection: vi.fn(), testOllama: vi.fn(), signInChatGpt: vi.fn(), signOutChatGpt: vi.fn(),
    setClaudeCliEnabled: vi.fn(), startClaudeCliLogin: vi.fn(), verifyClaudeCli: vi.fn(),
    getChatProviders: vi.fn().mockResolvedValue([{ id: 'openai', name: 'OpenAI', connected: true, method: 'api', defaultModel: 'gpt-test', models: ['gpt-test'] }]),
    sendChat: vi.fn().mockResolvedValue({ provider: 'openai', model: 'gpt-test', content: 'پاسخ واقعی آزمایشی' }),
    getCodeWorkspace: vi.fn().mockResolvedValue({ root: 'C:\\project', files: ['src/app.ts'] }),
    chooseCodeWorkspace: vi.fn().mockResolvedValue({ root: 'C:\\project', files: ['src/app.ts'] }),
    readWorkspaceFile: vi.fn().mockResolvedValue({ path: 'src/app.ts', content: 'const ready = false;' }),
    saveWorkspaceFile: vi.fn().mockResolvedValue({ root: 'C:\\project', files: ['src/app.ts'] }),
    runWorkspaceCommand: vi.fn().mockResolvedValue({ command: 'npm test', stdout: 'ok', stderr: '', exitCode: 0, timedOut: false }),
    getRuntimeInfo: vi.fn(),
  };
  Object.defineProperty(window, 'desktop', { configurable: true, value: desktop });
});

afterEach(() => cleanup());

describe('desktop renderer user flows', () => {
  it('sends a real provider request from the primary chat box and renders its answer', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('چه چیزی می‌خواهی بسازیم؟');
    const composer = screen.getByLabelText('پیام چت');
    await user.type(composer, 'یک تابع بنویس');
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(desktop.sendChat).toHaveBeenCalledWith({ provider: 'openai', model: 'gpt-test', messages: [{ role: 'user', content: 'یک تابع بنویس' }] });
    expect(await screen.findByText('پاسخ واقعی آزمایشی')).toBeTruthy();
  });

  it('guides a disconnected chat user to the connection screen', async () => {
    const user = userEvent.setup();
    desktop.getChatProviders.mockResolvedValue([{ id: 'openai', name: 'OpenAI', connected: false, method: 'api', defaultModel: 'gpt-test', models: ['gpt-test'] }]);
    render(<App />);
    expect(await screen.findByText('ابتدا یک حساب یا API را متصل کن.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'رفتن به اتصال‌ها' }));
    expect(await screen.findByText('اتصال‌های رسمی')).toBeTruthy();
  });

  it('renders the persisted dashboard and clearly labels mock providers', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText('چه چیزی می‌خواهی بسازیم؟')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'نمای کلی' }));
    expect(await screen.findByText('سلام، آمادهٔ ادامه‌ایم')).toBeTruthy();
    expect(screen.getAllByText('GPT Simulation').length).toBeGreaterThan(0);
    expect(screen.getByText(/فقط Mock هستند/)).toBeTruthy();
  });

  it('navigates to official connections without exposing a credential value', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('چه چیزی می‌خواهی بسازیم؟');
    await user.click(screen.getByRole('button', { name: 'اتصال‌ها' }));
    expect(screen.getByText('اتصال‌های رسمی')).toBeTruthy();
    const keyInput = screen.getByLabelText('کلید API') as HTMLInputElement;
    expect(keyInput.type).toBe('password');
    expect(keyInput.value).toBe('');
    expect(screen.getByText(/صفحه رسمی سرویس در مرورگر باز می‌شود/)).toBeTruthy();
  });

  it('starts official ChatGPT OAuth without collecting a website password', async () => {
    const user = userEvent.setup();
    desktop.signInChatGpt.mockResolvedValue({ connected: true, planUsage: true, email: 'user@example.com' });
    render(<App />);
    await screen.findByText('چه چیزی می‌خواهی بسازیم؟');
    await user.click(screen.getByRole('button', { name: 'اتصال‌ها' }));
    await user.click(screen.getByRole('button', { name: 'Continue with ChatGPT' }));
    expect(desktop.signInChatGpt).toHaveBeenCalledOnce();
    expect(await screen.findByText('user@example.com')).toBeTruthy();
    expect(screen.getByText('مجوز استفاده از پلن فعال است')).toBeTruthy();
  });

  it('keeps the unofficial Claude bridge disabled until its warning is accepted', async () => {
    const user = userEvent.setup();
    desktop.setClaudeCliEnabled.mockResolvedValue({ enabled: true, installed: true, loggedIn: false, version: '2.1.300' });
    render(<App />);
    await screen.findByText('چه چیزی می‌خواهی بسازیم؟');
    await user.click(screen.getByRole('button', { name: 'اتصال‌ها' }));
    expect(screen.getByText(/پل SynapseDock غیررسمی است/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'پذیرش ریسک و فعال‌سازی' }));
    expect(desktop.setClaudeCliEnabled).toHaveBeenCalledWith(true);
    expect(await screen.findByRole('button', { name: 'ورود رسمی Claude' })).toBeTruthy();
  });

  it('opens official Claude login and refreshes its public CLI status', async () => {
    const user = userEvent.setup();
    desktop.getClaudeCliStatus.mockResolvedValue({ enabled: true, installed: true, loggedIn: false, version: '2.1.300' });
    desktop.startClaudeCliLogin.mockResolvedValue({ launched: true, message: 'opened' });
    render(<App />);
    await screen.findByText('چه چیزی می‌خواهی بسازیم؟');
    await user.click(screen.getByRole('button', { name: 'اتصال‌ها' }));
    await user.click(await screen.findByRole('button', { name: 'ورود رسمی Claude' }));
    expect(desktop.startClaudeCliLogin).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'بررسی وضعیت' }));
    expect(desktop.getClaudeCliStatus).toHaveBeenCalledTimes(2);
  });

  it('verifies and can disable an already signed-in experimental Claude bridge', async () => {
    const user = userEvent.setup();
    desktop.getClaudeCliStatus.mockResolvedValue({ enabled: true, installed: true, loggedIn: true, authMethod: 'claude.ai', version: '2.1.300' });
    desktop.verifyClaudeCli.mockResolvedValue({ ok: true, message: 'verified', response: 'SYNAPSEDOCK_CLAUDE_OK' });
    desktop.setClaudeCliEnabled.mockResolvedValue({ enabled: false, installed: true, loggedIn: true, authMethod: 'claude.ai', version: '2.1.300' });
    render(<App />);
    await screen.findByText('چه چیزی می‌خواهی بسازیم؟');
    await user.click(screen.getByRole('button', { name: 'اتصال‌ها' }));
    await user.click(await screen.findByRole('button', { name: 'تأیید با یک درخواست' }));
    expect(desktop.verifyClaudeCli).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'غیرفعال' }));
    expect(desktop.setClaudeCliEnabled).toHaveBeenCalledWith(false);
  });

  it('creates a free-only persistent task through the modal and shows it in the queue', async () => {
    const user = userEvent.setup();
    const created: WorkspaceSnapshot = {
      ...initialSnapshot,
      tasks: [{ id: 'task-1', title: 'پروژه آزمایشی', goal: 'ادامه از checkpoint', status: 'queued', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
    };
    desktop.createTask.mockResolvedValue(created);
    render(<App />);
    await screen.findByText('چه چیزی می‌خواهی بسازیم؟');
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
    await screen.findByText('چه چیزی می‌خواهی بسازیم؟');
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(await screen.findByText('What should we build?')).toBeTruthy();
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('keeps settings visible and persists language and theme choices', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('چه چیزی می‌خواهی بسازیم؟');
    await user.click(screen.getByRole('button', { name: 'تنظیمات' }));
    expect(screen.getByRole('heading', { name: 'تنظیمات' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /English/ }));
    await user.click(screen.getByRole('button', { name: /Light/ }));
    expect(localStorage.getItem('synapsedock.locale')).toBe('en');
    expect(localStorage.getItem('synapsedock.theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('opens, edits, saves and runs files in the coding workspace', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('چه چیزی می‌خواهی بسازیم؟');
    await user.click(screen.getByRole('button', { name: 'فضای کدنویسی' }));
    await user.click(await screen.findByRole('button', { name: /src\/app.ts/ }));
    const editor = screen.getByLabelText('ویرایشگر کد');
    await user.clear(editor);
    await user.type(editor, 'const ready = true;');
    await user.click(screen.getByRole('button', { name: 'ذخیره' }));
    expect(desktop.saveWorkspaceFile).toHaveBeenCalledWith({ path: 'src/app.ts', content: 'const ready = true;' });
    await user.click(screen.getByRole('button', { name: 'اجرا' }));
    expect(desktop.runWorkspaceCommand).toHaveBeenCalledWith('npx tsx "src/app.ts"');
    const terminal = screen.getByLabelText('فرمان ترمینال');
    await user.clear(terminal);
    await user.type(terminal, 'npm test');
    await user.keyboard('{Enter}');
    expect(desktop.runWorkspaceCommand).toHaveBeenCalledWith('npm test');
    await user.click(screen.getByRole('button', { name: 'پرسش از AI' }));
    expect((await screen.findByLabelText('پیام چت') as HTMLTextAreaElement).value).toContain('const ready = true;');
  });

  it('opens formerly placeholder modules and persists a local agent profile', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('چه چیزی می‌خواهی بسازیم؟');
    await user.click(screen.getByRole('button', { name: /عامل‌ها/ }));
    const editor = screen.getByLabelText('عامل‌ها');
    await user.type(editor, 'Reviewer | Read-only review');
    await user.click(screen.getByRole('button', { name: 'ذخیره' }));
    expect(localStorage.getItem('synapsedock.module.agents')).toContain('Reviewer');
  });

  it('validates MCP JSON locally and exposes the security view', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('چه چیزی می‌خواهی بسازیم؟');
    await user.click(screen.getByRole('button', { name: /MCP و افزونه‌ها/ }));
    const editor = screen.getByLabelText('MCP و افزونه‌ها');
    await user.clear(editor);
    await user.type(editor, 'broken');
    await user.click(screen.getByRole('button', { name: 'ذخیره' }));
    expect(await screen.findByText('JSON مربوط به MCP معتبر نیست.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'امنیت و مجوزها' }));
    expect(screen.getByText('رمزها و کلیدها')).toBeTruthy();
  });

  it('shows the expanded provider catalog in Settings and can connect Kimi by API key', async () => {
    const user = userEvent.setup();
    desktop.testConnection.mockResolvedValue({ ok: true, message: 'verified', models: ['kimi-k3'] });
    render(<App />);
    await screen.findByText('چه چیزی می‌خواهی بسازیم؟');
    await user.click(screen.getByRole('button', { name: 'تنظیمات' }));
    expect(screen.getByText('Kimi / Moonshot')).toBeTruthy();
    expect(screen.getByText('Runway')).toBeTruthy();
    expect(screen.getByText('ElevenLabs')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Kimi \/ Moonshot/ }));
    await user.type(screen.getByLabelText('کلید API'), 'kimi-secret-key');
    await user.click(screen.getByRole('button', { name: 'بررسی و اتصال' }));
    expect(desktop.testConnection).toHaveBeenCalledWith({ provider: 'kimi', apiKey: 'kimi-secret-key' });
  });
});
