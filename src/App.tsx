import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Bot, Boxes, Check, ChevronLeft, CircleDollarSign, Clock3, Code2,
  Command, Cpu, Database, FileCode2, Gauge, Globe2, LayoutDashboard, ListTodo, MemoryStick,
  Moon, Network, Play, Plus, RefreshCw, Search, Settings, ShieldCheck, Sparkles, Sun, Unplug,
  Workflow, X, Zap,
} from 'lucide-react';
import type { ProviderAccount } from './core/types';
import { PROVIDER_CATALOG, providerCatalogItem, type CloudProviderId } from './core/provider-catalog';
import type { ChatGptConnectionStatus, ClaudeCliStatus, ConnectionTestResult, WorkspaceSnapshot } from './shared/api';

type View = 'dashboard' | 'quota' | 'tasks' | 'connections' | 'code' | 'agents' | 'automations' | 'mcp' | 'memory' | 'security' | 'settings';
type Locale = 'fa' | 'en';
type Theme = 'dark' | 'light';

const nav = [
  { id: 'dashboard', fa: 'نمای کلی', en: 'Overview', icon: LayoutDashboard },
  { id: 'quota', fa: 'سهمیه‌ها', en: 'Quotas', icon: Gauge },
  { id: 'tasks', fa: 'وظایف', en: 'Tasks', icon: ListTodo },
  { id: 'connections', fa: 'اتصال‌ها', en: 'Connections', icon: Network },
  { id: 'code', fa: 'فضای کدنویسی', en: 'Coding workspace', icon: Code2 },
] as const;

const future = [
  { id: 'agents', fa: 'عامل‌ها', en: 'Agents', icon: Bot },
  { id: 'automations', fa: 'اتوماسیون', en: 'Automations', icon: Workflow },
  { id: 'mcp', fa: 'MCP و افزونه‌ها', en: 'MCP & plugins', icon: Boxes },
  { id: 'memory', fa: 'حافظه', en: 'Memory', icon: MemoryStick },
] as const;

const labels = {
  fa: {
    product: 'فضای کار هوش مصنوعی', command: 'جست‌وجو یا اجرای فرمان…', auto: 'حالت خودکار جامع',
    autoDesc: 'مسیریابی امن براساس سهمیه، قابلیت و هزینه', live: 'فعال', newTask: 'وظیفهٔ جدید',
    hello: 'سلام، آمادهٔ ادامه‌ایم', sub: 'وضعیت مدل‌ها، صف پایدار و نقاط بازیابی در یک نگاه.',
    running: 'در حال اجرا', waiting: 'در انتظار سهمیه', connected: 'اتصال واقعی', checkpoints: 'نقطهٔ بازیابی',
    providers: 'وضعیت ارائه‌دهنده‌ها', viewAll: 'مشاهدهٔ همه', activity: 'رویدادهای اخیر',
    simulation: 'آزمایش موتور Failover', simulationDesc: 'این سناریوها فقط Mock هستند و اتصال واقعی محسوب نمی‌شوند.',
    timeline: 'خط زمانی بازنشانی سهمیه', noReset: 'زمان معتبری گزارش نشده', tasks: 'صف وظایف پایدار',
    noTasks: 'هنوز وظیفه‌ای ساخته نشده است.', connections: 'اتصال‌های رسمی', connDesc: 'ورود در صفحه رسمی سرویس انجام می‌شود؛ کلیدها و توکن‌ها با رمزنگاری سیستم‌عامل ذخیره می‌شوند.',
    quota: 'داشبورد سهمیه', quotaDesc: 'درصد فقط وقتی نمایش داده می‌شود که منبع معتبر یا Mock مشخص داشته باشد.',
    coming: 'در حال توسعه', theme: 'تغییر پوسته', free: 'فقط رایگان', cancel: 'انصراف', create: 'ساخت وظیفه',
    title: 'عنوان', goal: 'هدف و معیار پایان', connect: 'بررسی و اتصال', apiKey: 'کلید API', localTest: 'بررسی Ollama محلی',
    unknown: 'نامشخص', remaining: 'باقی‌مانده', used: 'مصرف', reset: 'بازنشانی', source: 'منبع',
  },
  en: {
    product: 'AI Workspace', command: 'Search or run a command…', auto: 'Synapse Auto Mode',
    autoDesc: 'Safe routing by quota, capability and cost', live: 'Active', newTask: 'New task',
    hello: 'Welcome back', sub: 'Provider health, persistent queue and recovery points at a glance.',
    running: 'Running', waiting: 'Waiting for quota', connected: 'Real connections', checkpoints: 'Checkpoints',
    providers: 'Provider status', viewAll: 'View all', activity: 'Recent activity',
    simulation: 'Failover engine lab', simulationDesc: 'These are mock scenarios and never count as real connections.',
    timeline: 'Quota reset timeline', noReset: 'No verified reset reported', tasks: 'Persistent task queue',
    noTasks: 'No tasks have been created yet.', connections: 'Official connections', connDesc: 'Sign-in happens on the provider page; keys and tokens stay encrypted in the main process.',
    quota: 'Quota dashboard', quotaDesc: 'A percentage appears only when its source is known or explicitly simulated.',
    coming: 'In development', theme: 'Toggle theme', free: 'Free only', cancel: 'Cancel', create: 'Create task',
    title: 'Title', goal: 'Goal and completion criteria', connect: 'Verify & connect', apiKey: 'API key', localTest: 'Test local Ollama',
    unknown: 'Unknown', remaining: 'Remaining', used: 'Used', reset: 'Reset', source: 'Source',
  },
} as const;

const providerTone: Record<string, string> = { mock: 'violet', openai: 'mint', anthropic: 'amber', google: 'blue', xai: 'slate', ollama: 'rose', replicate: 'violet', stability: 'blue', runway: 'rose', elevenlabs: 'amber' };
const scenarioLabels = {
  'gpt-90': ['GPT → ۹۰٪', 'GPT → 90%'],
  'claude-exhausted': ['Claude → پایان سهمیه', 'Claude → exhausted'],
  'all-exhausted': ['تمام سهمیه‌ها → انتظار', 'All exhausted → wait'],
  'reset-recovered': ['بازگشت سهمیه → بازیابی', 'Reset → recover'],
} as const;

function readPreference<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key) as T | null;
    return value && allowed.includes(value) ? value : fallback;
  } catch { return fallback; }
}

export function App() {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>();
  const [view, setView] = useState<View>('dashboard');
  const [locale, setLocale] = useState<Locale>(() => readPreference('synapsedock.locale', ['fa', 'en'], 'fa'));
  const [theme, setTheme] = useState<Theme>(() => readPreference('synapsedock.theme', ['dark', 'light'], 'dark'));
  const [taskOpen, setTaskOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const t = labels[locale];

  useEffect(() => { void window.desktop.getSnapshot().then(setSnapshot); }, []);
  useEffect(() => {
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('synapsedock.locale', locale);
      localStorage.setItem('synapsedock.theme', theme);
    } catch { /* Preferences still apply for this session. */ }
  }, [locale, theme]);

  async function runScenario(scenario: keyof typeof scenarioLabels) {
    setBusy(true); setNotice(undefined);
    try { setSnapshot(await window.desktop.runScenario(scenario)); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Scenario failed'); }
    finally { setBusy(false); }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Sparkles size={20} /></div><div><strong>SynapseDock</strong><span>{t.product}</span></div></div>
        <button className="auto-card"><div className="auto-icon"><Zap size={18} /></div><div><strong>{t.auto}</strong><span>{t.autoDesc}</span></div><span className="live-dot">{t.live}</span></button>
        <nav className="primary-nav">
          {nav.map((item) => <button key={item.id} data-view={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><item.icon size={18} /><span>{item[locale]}</span>{view === item.id && <ChevronLeft size={15} className="nav-chevron" />}</button>)}
        </nav>
        <div className="nav-divider" />
        <nav className="future-nav">
          {future.map((item) => <button key={item.id} data-view={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><item.icon size={17} /><span>{item[locale]}</span><small>{locale === 'fa' ? 'محلی' : 'Local'}</small></button>)}
        </nav>
        <div className="sidebar-bottom">
          <button data-view="security" className={view === 'security' ? 'active' : ''} onClick={() => setView('security')}><ShieldCheck size={17} /><span>{locale === 'fa' ? 'امنیت و مجوزها' : 'Security & permissions'}</span></button>
          <button data-view="settings" className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}><Settings size={17} /><span>{locale === 'fa' ? 'تنظیمات' : 'Settings'}</span></button>
          <div className="profile"><div className="avatar">U</div><div><strong>{locale === 'fa' ? 'فضای محلی' : 'Local workspace'}</strong><span>{locale === 'fa' ? 'داده‌ها روی این دستگاه' : 'On-device data'}</span></div><span className="status-dot" /></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="searchbox"><Search size={17} /><span>{t.command}</span><kbd><Command size={12} /> K</kbd></div>
          <div className="top-actions">
            <button className="icon-button" title={t.theme} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="locale-button" onClick={() => setLocale(locale === 'fa' ? 'en' : 'fa')}>{locale === 'fa' ? 'EN' : 'فا'}</button>
            <button className="primary-button" onClick={() => setTaskOpen(true)}><Plus size={17} />{t.newTask}</button>
          </div>
        </header>

        <section className="content">
          {!snapshot ? <Loading /> : <>
            {view === 'dashboard' && <Dashboard snapshot={snapshot} locale={locale} onNavigate={setView} onScenario={runScenario} busy={busy} />}
            {view === 'quota' && <QuotaView accounts={snapshot.accounts} locale={locale} />}
            {view === 'tasks' && <TasksView snapshot={snapshot} locale={locale} />}
            {view === 'connections' && <ConnectionsView snapshot={snapshot} locale={locale} onRefresh={() => window.desktop.getSnapshot().then(setSnapshot)} onNotice={setNotice} />}
            {view === 'code' && <CodeWorkspace locale={locale} onNotice={setNotice} />}
            {view === 'agents' && <LocalModuleView kind="agents" locale={locale} onNotice={setNotice} />}
            {view === 'automations' && <LocalModuleView kind="automations" locale={locale} onNotice={setNotice} />}
            {view === 'mcp' && <LocalModuleView kind="mcp" locale={locale} onNotice={setNotice} />}
            {view === 'memory' && <LocalModuleView kind="memory" locale={locale} onNotice={setNotice} />}
            {view === 'security' && <SecurityView locale={locale} />}
            {view === 'settings' && <SettingsView locale={locale} theme={theme} onLocale={setLocale} onTheme={setTheme} onConnections={() => setView('connections')} onRefresh={() => window.desktop.getSnapshot().then(setSnapshot)} onNotice={setNotice} />}
          </>}
        </section>
      </main>
      {taskOpen && <TaskModal locale={locale} onClose={() => setTaskOpen(false)} onCreated={(next) => { setSnapshot(next); setTaskOpen(false); setView('tasks'); }} />}
      {notice && <div className="toast"><AlertTriangle size={17} />{notice}<button onClick={() => setNotice(undefined)}><X size={15} /></button></div>}
    </div>
  );
}

function Dashboard({ snapshot, locale, onNavigate, onScenario, busy }: { snapshot: WorkspaceSnapshot; locale: Locale; onNavigate: (v: View) => void; onScenario: (s: keyof typeof scenarioLabels) => void; busy: boolean }) {
  const t = labels[locale];
  const stats = [
    { label: t.running, value: snapshot.stats.running, icon: Play, tone: 'mint' },
    { label: t.waiting, value: snapshot.stats.waiting, icon: Clock3, tone: 'amber' },
    { label: t.connected, value: snapshot.stats.connected, icon: Network, tone: 'blue' },
    { label: t.checkpoints, value: snapshot.stats.checkpoints, icon: Database, tone: 'violet' },
  ];
  return <>
    <div className="page-heading"><div><p className="eyebrow"><span className="pulse" /> SYSTEM READY</p><h1>{t.hello}</h1><p>{t.sub}</p></div><div className="heading-orb"><Cpu size={31} /></div></div>
    <div className="stat-grid">{stats.map((stat) => <article className="stat-card" key={stat.label}><div className={`stat-icon ${stat.tone}`}><stat.icon size={20} /></div><div><span>{stat.label}</span><strong>{localNumber(stat.value, locale)}</strong></div><div className="sparkline"><i /><i /><i /><i /><i /></div></article>)}</div>
    <div className="dashboard-grid">
      <section className="panel providers-panel"><PanelHeader icon={Cpu} title={t.providers} action={t.viewAll} onAction={() => onNavigate('quota')} />
        <div className="provider-list">{snapshot.accounts.slice(0, 5).map((account) => <ProviderRow account={account} locale={locale} key={account.id} />)}</div>
      </section>
      <section className="panel activity-panel"><PanelHeader icon={Activity} title={t.activity} />
        <div className="activity-list">{snapshot.activities.map((item) => <div className="activity-row" key={item.id}><span className={`activity-dot ${item.level}`} /><div><p>{item.message}</p><time>{formatRelative(item.createdAt, locale)}</time></div></div>)}</div>
      </section>
      <section className="panel lab-panel"><PanelHeader icon={Workflow} title={t.simulation} /><p className="panel-note"><AlertTriangle size={15} />{t.simulationDesc}</p>
        <div className="scenario-grid">{(Object.keys(scenarioLabels) as Array<keyof typeof scenarioLabels>).map((scenario) => <button key={scenario} disabled={busy} onClick={() => onScenario(scenario)}>{busy ? <RefreshCw className="spin" size={15} /> : <Play size={15} />} {scenarioLabels[scenario][locale === 'fa' ? 0 : 1]}</button>)}</div>
      </section>
      <ResetTimeline accounts={snapshot.accounts} locale={locale} />
    </div>
  </>;
}

function QuotaView({ accounts, locale }: { accounts: ProviderAccount[]; locale: Locale }) {
  const t = labels[locale];
  return <><ViewHeading icon={Gauge} title={t.quota} description={t.quotaDesc} />
    <div className="quota-table panel"><div className="table-head"><span>Provider / Account</span><span>Model</span><span>{t.used}</span><span>{t.remaining}</span><span>{t.reset}</span><span>Status</span></div>
      {accounts.map((account) => {
        const measured = account.quotaWindows.filter((w) => typeof w.usedPercent === 'number').sort((a, b) => b.usedPercent! - a.usedPercent!)[0];
        return <div className="table-row" key={account.id}><div className="account-cell"><ProviderLogo provider={account.provider} /><div><strong>{account.displayName}</strong><small>{account.plan}{account.simulation ? ' · MOCK' : ''}</small></div></div><span className="model-cell">{account.model}</span><QuotaMeter value={measured?.usedPercent} /><strong>{measured?.usedPercent == null ? t.unknown : `${localNumber(100 - measured.usedPercent, locale)}٪`}</strong><span>{measured?.resetAt ? formatDate(measured.resetAt, locale) : t.unknown}</span><StatusBadge account={account} locale={locale} /></div>;
      })}
    </div></>;
}

function TasksView({ snapshot, locale }: { snapshot: WorkspaceSnapshot; locale: Locale }) {
  const t = labels[locale];
  return <><ViewHeading icon={ListTodo} title={t.tasks} description={locale === 'fa' ? 'صف در SQLite ذخیره می‌شود و پس از راه‌اندازی مجدد باقی می‌ماند.' : 'The queue persists in SQLite and survives application restarts.'} />
    <div className="task-board">{snapshot.tasks.length === 0 ? <div className="empty-state panel"><ListTodo size={34} /><h3>{t.noTasks}</h3><p>{locale === 'fa' ? 'از دکمهٔ «وظیفهٔ جدید» شروع کنید.' : 'Start with the New task button.'}</p></div> : snapshot.tasks.map((task) => <article className="task-card panel" key={task.id}><div className="task-top"><span className={`task-state ${task.status}`}>{task.status}</span><time>{formatDate(task.updatedAt, locale)}</time></div><h3>{task.title}</h3><p>{task.goal}</p><div className="task-meta"><span><FileCode2 size={14} /> {task.id.slice(0, 8)}</span>{task.retryAt && <span><Clock3 size={14} /> {formatDate(task.retryAt, locale)}</span>}</div></article>)}</div>
  </>;
}

function ConnectionsView({ snapshot, locale, onRefresh, onNotice }: { snapshot: WorkspaceSnapshot; locale: Locale; onRefresh: () => void; onNotice: (s: string) => void }) {
  const t = labels[locale];
  const [busy, setBusy] = useState(false);
  const [chatGpt, setChatGpt] = useState<ChatGptConnectionStatus>({ connected: false, planUsage: false });
  const [claudeCli, setClaudeCli] = useState<ClaudeCliStatus>({ enabled: false, installed: false, loggedIn: false });
  const [claudeLoading, setClaudeLoading] = useState(true);
  useEffect(() => {
    void window.desktop.getChatGptStatus().then(setChatGpt).catch(() => undefined);
    void window.desktop.getClaudeCliStatus().then(setClaudeCli).catch(() => undefined).finally(() => setClaudeLoading(false));
  }, []);
  async function signInChatGpt() { setBusy(true); try { setChatGpt(await window.desktop.signInChatGpt()); onRefresh(); } catch (error) { onNotice(error instanceof Error ? error.message : 'ChatGPT sign-in failed'); } finally { setBusy(false); } }
  async function signOutChatGpt() { setBusy(true); try { const next = await window.desktop.signOutChatGpt(); setChatGpt({ connected: false, planUsage: false }); onRefresh(); onNotice(next.remoteRevoked ? (locale === 'fa' ? 'اتصال ChatGPT با موفقیت لغو شد.' : 'ChatGPT connection revoked.') : (locale === 'fa' ? 'اتصال محلی حذف شد؛ وضعیت لغو از راه دور تأیید نشد.' : 'Local connection removed; remote revocation was not confirmed.')); } finally { setBusy(false); } }
  async function toggleClaude(enabled: boolean) { setBusy(true); try { setClaudeCli(await window.desktop.setClaudeCliEnabled(enabled)); onRefresh(); } catch (error) { onNotice(error instanceof Error ? error.message : 'Claude connector update failed'); } finally { setBusy(false); } }
  async function loginClaude() { setBusy(true); try { const next = await window.desktop.startClaudeCliLogin(); onNotice(locale === 'fa' ? (next.launched ? 'پنجره ورود رسمی Claude باز شد. بعد از ورود، «بررسی وضعیت» را بزنید.' : next.message) : next.message); } catch (error) { onNotice(error instanceof Error ? error.message : 'Claude login failed'); } finally { setBusy(false); } }
  async function refreshClaude() { setBusy(true); try { setClaudeCli(await window.desktop.getClaudeCliStatus()); } finally { setBusy(false); } }
  async function verifyClaude() { setBusy(true); try { const next = await window.desktop.verifyClaudeCli(); onNotice(locale === 'fa' ? (next.ok ? 'اتصال Claude با یک درخواست محدود تأیید شد.' : next.message) : next.message); if (next.ok) onRefresh(); } catch (error) { onNotice(error instanceof Error ? error.message : 'Claude verification failed'); } finally { setBusy(false); } }
  return <><ViewHeading icon={Network} title={t.connections} description={t.connDesc} />
    <div className="credential-guide panel"><ShieldCheck size={21} /><div><strong>{locale === 'fa' ? 'ورود امن حساب‌های AI' : 'Secure AI account sign-in'}</strong><p>{locale === 'fa' ? 'دکمه ورود را بزنید؛ صفحه رسمی سرویس در مرورگر باز می‌شود و ایمیل، رمز و 2FA را همان‌جا وارد می‌کنید. SynapseDock رمز عبور را نمی‌بیند یا ذخیره نمی‌کند.' : 'Choose sign in to open the provider’s official page in your browser. Enter email, password, and 2FA there; SynapseDock never sees or stores the password.'}</p></div></div>
    <section className="panel subscription-panel"><PanelHeader icon={Globe2} title={locale === 'fa' ? 'اتصال رسمی اشتراک' : 'Official subscription connections'} /><div className="subscription-grid"><article className="subscription-card"><div className="provider-logo mint"><Sparkles size={18} /></div><div><strong>ChatGPT</strong><span>{chatGpt.connected ? (chatGpt.email ?? chatGpt.name ?? (locale === 'fa' ? 'حساب متصل' : 'Connected account')) : (locale === 'fa' ? 'ورود رسمی با مرورگر و OAuth' : 'Official browser sign-in with OAuth')}</span>{chatGpt.connected && <small className={chatGpt.planUsage ? 'permission-ok' : 'permission-warn'}>{chatGpt.planUsage ? (locale === 'fa' ? 'مجوز استفاده از پلن فعال است' : 'Plan usage permission granted') : (locale === 'fa' ? 'هویت متصل است؛ مجوز پلن داده نشده' : 'Identity connected; plan usage not granted')}</small>}</div>{chatGpt.connected ? <button className="ghost-button" disabled={busy} onClick={signOutChatGpt}>{locale === 'fa' ? 'خروج' : 'Disconnect'}</button> : <button className="primary-button" disabled={busy} onClick={signInChatGpt}>{busy ? <RefreshCw className="spin" size={15} /> : <Globe2 size={15} />}Continue with ChatGPT</button>}</article>
      <article className={`subscription-card claude-experimental ${claudeCli.enabled ? '' : 'muted'}`}><div className="provider-logo amber"><Bot size={18} /></div><div><strong>Claude Pro / Max <em>EXPERIMENTAL</em></strong><span>{claudeLoading ? (locale === 'fa' ? 'در حال بررسی Claude Code…' : 'Checking Claude Code…') : !claudeCli.installed ? (locale === 'fa' ? 'Claude Code رسمی روی دستگاه پیدا نشد' : 'Official Claude Code was not found') : claudeCli.loggedIn ? `${claudeCli.authMethod} · ${claudeCli.version ?? ''}` : (locale === 'fa' ? 'Claude Code نصب است؛ هنوز وارد حساب نشده‌اید' : 'Claude Code is installed; sign-in is required')}</span><small className="permission-warn">{locale === 'fa' ? 'پل SynapseDock غیررسمی است؛ ممکن است با تغییر CLI از کار بیفتد و درخواست تأیید از سهمیه کم می‌کند.' : 'The SynapseDock bridge is unofficial; CLI changes may break it and verification consumes plan usage.'}</small></div><div className="subscription-actions">{!claudeCli.enabled ? <button className="warning-button" disabled={busy || claudeLoading} onClick={() => toggleClaude(true)}>{locale === 'fa' ? 'پذیرش ریسک و فعال‌سازی' : 'Accept risk & enable'}</button> : <>{claudeCli.installed && !claudeCli.loggedIn && <button className="primary-button" disabled={busy} onClick={loginClaude}>{locale === 'fa' ? 'ورود رسمی Claude' : 'Official Claude login'}</button>}<button className="ghost-button" disabled={busy} onClick={refreshClaude}>{locale === 'fa' ? 'بررسی وضعیت' : 'Refresh status'}</button>{claudeCli.loggedIn && <button className="primary-button" disabled={busy} onClick={verifyClaude}>{locale === 'fa' ? 'تأیید با یک درخواست' : 'Verify with one request'}</button>}<button className="text-button danger" disabled={busy} onClick={() => toggleClaude(false)}>{locale === 'fa' ? 'غیرفعال' : 'Disable'}</button></>}</div></article>
      <article className="subscription-card"><div className="provider-logo blue"><Bot size={18} /></div><div><strong>Gemini / Google</strong><span>{locale === 'fa' ? 'اتصال رسمی با API Key در کاتالوگ پایین فعال است؛ OAuth ناشر جداگانه می‌خواهد.' : 'Official API-key connection is active below; account OAuth requires separate publisher setup.'}</span></div><small className="permission-ok">{locale === 'fa' ? 'API فعال' : 'API active'}</small></article>
      <article className="subscription-card"><div className="provider-logo slate"><Bot size={18} /></div><div><strong>Grok / xAI</strong><span>{locale === 'fa' ? 'اتصال رسمی xAI API در کاتالوگ پایین فعال است؛ اشتراک وب با API یکی نیست.' : 'Official xAI API connection is active below; the web subscription is separate.'}</span></div><small className="permission-ok">{locale === 'fa' ? 'API فعال' : 'API active'}</small></article></div><p className="subscription-note">{locale === 'fa' ? 'استفاده از پلن ChatGPT در برنامه‌های شخص ثالث در وضعیت preview است. اتصال آزمایشی Claude فقط CLI رسمی را اجرا می‌کند؛ SynapseDock کوکی، رمز یا توکن Claude را نمی‌خواند.' : 'ChatGPT plan usage in third-party apps is in preview. The experimental Claude bridge only invokes the official CLI; SynapseDock never reads Claude cookies, passwords, or tokens.'}</p></section>
    <h2 className="connection-section-title">{locale === 'fa' ? `${localNumber(PROVIDER_CATALOG.length, locale)} اتصال رسمی متن، کد، تصویر، ویدئو و صدا` : `${PROVIDER_CATALOG.length} official text, code, image, video and audio connections`}</h2>
    <div className="connections-grid"><ApiConnectionForm locale={locale} onRefresh={onRefresh} onNotice={onNotice} />
      <section className="panel connection-list"><PanelHeader icon={Network} title={locale === 'fa' ? 'وضعیت اتصال‌ها' : 'Connection status'} />{snapshot.accounts.filter((a) => !a.simulation).map((account) => <ProviderRow account={account} locale={locale} key={account.id} />)}<div className="legal-note"><ShieldCheck size={16} /><p>{locale === 'fa' ? 'اشتراک وب با API یکسان نیست. سهمیهٔ اشتراک فقط از مسیر رسمی و مجاز همان سرویس استفاده می‌شود.' : 'Web subscriptions are not API access. Subscription quota is used only through an explicitly supported official flow.'}</p></div></section></div>
  </>;
}

function ApiConnectionForm({ locale, onRefresh, onNotice }: { locale: Locale; onRefresh: () => void; onNotice: (message: string) => void }) {
  const t = labels[locale];
  const [provider, setProvider] = useState<CloudProviderId>('openai');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConnectionTestResult>();
  const selected = providerCatalogItem(provider);
  async function connect() {
    setBusy(true); setResult(undefined);
    try {
      const next = await window.desktop.testConnection({ provider, apiKey });
      setResult(next);
      if (next.ok) { setApiKey(''); onRefresh(); }
    } catch (error) { onNotice(error instanceof Error ? error.message : 'Connection failed'); }
    finally { setBusy(false); }
  }
  async function ollama() {
    setBusy(true);
    try { const next = await window.desktop.testOllama(); setResult(next); if (next.ok) onRefresh(); }
    finally { setBusy(false); }
  }
  return <section className="panel connect-form provider-catalog-panel">
    <div className="catalog-heading"><div><strong>{locale === 'fa' ? 'کاتالوگ ارائه‌دهنده‌ها' : 'Provider catalog'}</strong><span>{locale === 'fa' ? 'یک سرویس را انتخاب و کلید رسمی همان سرویس را وارد کنید.' : 'Select a service and enter its official credential.'}</span></div><b>{PROVIDER_CATALOG.length}</b></div>
    <div className="provider-catalog-grid">{PROVIDER_CATALOG.map((item) => <button type="button" className={provider === item.id ? 'active' : ''} onClick={() => { setProvider(item.id); setResult(undefined); }} key={item.id}><ProviderLogo provider={item.id} /><span><strong>{item.name}</strong><small>{item.category === 'text-code' ? (locale === 'fa' ? 'متن و کد' : 'Text & code') : item.category === 'image-video' ? (locale === 'fa' ? 'تصویر و ویدئو' : 'Image & video') : (locale === 'fa' ? 'صدا' : 'Audio')} · {item.freeTier}</small></span></button>)}</div>
    <div className="selected-provider"><ProviderLogo provider={provider} /><div><strong>{selected.name}</strong><span>{selected.capabilities.join(' · ')}</span></div></div>
    <label>{locale === 'fa' ? (selected.credential === 'access token' ? 'توکن دسترسی' : 'کلید API') : selected.credential}<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={locale === 'fa' ? `کلید رسمی ${selected.name}` : `Official ${selected.name} credential`} autoComplete="new-password" /></label>
    <p className="field-help">{locale === 'fa' ? 'فقط یک درخواست خواندنی برای اعتبارسنجی ارسال می‌شود؛ تولید محتوا و هزینه آزمایش نمی‌شود.' : 'Only a read-only validation request is sent; generation and billing are not tested.'}</p>
    <button className="primary-button wide" disabled={busy || apiKey.length < 8} onClick={connect}>{busy ? <RefreshCw className="spin" size={17} /> : <ShieldCheck size={17} />}{t.connect}</button>
    <div className="local-connect"><div><strong>Ollama</strong><span>{locale === 'fa' ? 'بدون کلید، فقط روی این دستگاه' : 'No key, this device only'}</span></div><button onClick={ollama} disabled={busy}>{t.localTest}</button></div>
    {result && <div className={`connection-result ${result.ok ? 'ok' : 'error'}`}>{result.ok ? <Check size={16} /> : <Unplug size={16} />}<span>{result.message}{result.models?.length ? ` · ${result.models.slice(0, 3).join(', ')}` : ''}</span></div>}
  </section>;
}

function CodeWorkspace({ locale, onNotice }: { locale: Locale; onNotice: (message: string) => void }) {
  const [language, setLanguage] = useState(() => readPreference('synapsedock.code.language', ['typescript', 'python', 'powershell', 'text'], 'typescript'));
  const [draft, setDraft] = useState(() => {
    try { return localStorage.getItem('synapsedock.code.draft') ?? '// SynapseDock local scratchpad\n'; }
    catch { return '// SynapseDock local scratchpad\n'; }
  });
  function saveDraft() {
    try {
      localStorage.setItem('synapsedock.code.draft', draft);
      localStorage.setItem('synapsedock.code.language', language);
      onNotice(locale === 'fa' ? 'پیش‌نویس کد روی همین دستگاه ذخیره شد.' : 'Code draft saved on this device.');
    } catch { onNotice(locale === 'fa' ? 'ذخیره محلی در دسترس نیست.' : 'Local storage is unavailable.'); }
  }
  return <><ViewHeading icon={Code2} title={locale === 'fa' ? 'فضای کدنویسی' : 'Coding workspace'} description={locale === 'fa' ? 'ویرایشگر محلی برای نوشتن و نگه‌داری پیش‌نویس کد. اجرای کد هنوز فعال نیست.' : 'A local editor for writing and keeping code drafts. Code execution is not enabled yet.'} />
    <section className="panel code-workspace"><div className="code-toolbar"><div className="language-tabs">{(['typescript', 'python', 'powershell', 'text'] as const).map((item) => <button className={language === item ? 'active' : ''} onClick={() => setLanguage(item)} key={item}>{item}</button>)}</div><div className="code-actions"><span>{localNumber(draft.split('\n').length, locale)} {locale === 'fa' ? 'خط' : 'lines'}</span><button className="ghost-button" onClick={() => setDraft('')}>{locale === 'fa' ? 'پاک‌کردن' : 'Clear'}</button><button className="primary-button" onClick={saveDraft}><Database size={15} />{locale === 'fa' ? 'ذخیره محلی' : 'Save locally'}</button></div></div><textarea className="code-editor" dir="ltr" aria-label={locale === 'fa' ? 'ویرایشگر کد' : 'Code editor'} spellCheck={false} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveDraft(); } }} /><div className="code-boundary"><AlertTriangle size={15} /><span>{locale === 'fa' ? 'این نسخه پیش‌نویس را محلی نگه می‌دارد؛ ترمینال، اجرای کد و دسترسی مستقیم به فایل‌ها هنوز پیاده‌سازی نشده‌اند.' : 'This release keeps drafts locally; terminal execution and direct file access are not implemented yet.'}</span></div></section>
  </>;
}

type LocalModuleKind = 'agents' | 'automations' | 'mcp' | 'memory';
const localModuleInfo: Record<LocalModuleKind, { icon: typeof Bot; fa: string; en: string; faDesc: string; enDesc: string; placeholder: string }> = {
  agents: { icon: Bot, fa: 'عامل‌ها', en: 'Agents', faDesc: 'پروفایل عامل‌ها را محلی تعریف کنید؛ هر خط یک عامل و نقش آن است.', enDesc: 'Define local agent profiles; one agent and role per line.', placeholder: 'Reviewer | Reviews code without editing\nResearcher | Collects cited sources' },
  automations: { icon: Workflow, fa: 'اتوماسیون', en: 'Automations', faDesc: 'دستورهای تکرارشونده را محلی ثبت کنید. اجرای زمان‌بندی‌شده پس از اتصال موتور کار انجام می‌شود.', enDesc: 'Store recurring workflow definitions locally. Scheduled execution requires a connected worker.', placeholder: 'Daily review | 09:00 | Review queued tasks' },
  mcp: { icon: Boxes, fa: 'MCP و افزونه‌ها', en: 'MCP & plugins', faDesc: 'پیکربندی JSON سرورهای MCP را نگه‌داری و پیش از اتصال بررسی کنید.', enDesc: 'Keep and validate MCP server JSON before any connection is attempted.', placeholder: '{\n  "mcpServers": {}\n}' },
  memory: { icon: MemoryStick, fa: 'حافظه', en: 'Memory', faDesc: 'یادداشت‌های فضای کار فقط روی این دستگاه ذخیره می‌شوند.', enDesc: 'Workspace memory notes are stored only on this device.', placeholder: 'Project decisions, conventions, and context…' },
};

function LocalModuleView({ kind, locale, onNotice }: { kind: LocalModuleKind; locale: Locale; onNotice: (message: string) => void }) {
  const info = localModuleInfo[kind];
  const key = `synapsedock.module.${kind}`;
  const [value, setValue] = useState(() => { try { return localStorage.getItem(key) ?? (kind === 'mcp' ? info.placeholder : ''); } catch { return ''; } });
  function save() {
    if (kind === 'mcp') {
      try { JSON.parse(value); } catch { onNotice(locale === 'fa' ? 'JSON مربوط به MCP معتبر نیست.' : 'MCP JSON is invalid.'); return; }
    }
    try { localStorage.setItem(key, value); onNotice(locale === 'fa' ? 'تنظیمات محلی ذخیره شد.' : 'Local module settings saved.'); }
    catch { onNotice(locale === 'fa' ? 'ذخیره محلی در دسترس نیست.' : 'Local storage is unavailable.'); }
  }
  return <><ViewHeading icon={info.icon} title={info[locale]} description={locale === 'fa' ? info.faDesc : info.enDesc} /><section className="panel local-module"><PanelHeader icon={info.icon} title={locale === 'fa' ? 'پیکربندی محلی' : 'Local configuration'} /><div className="local-module-body"><textarea dir={kind === 'mcp' ? 'ltr' : undefined} rows={14} value={value} placeholder={info.placeholder} onChange={(event) => setValue(event.target.value)} aria-label={info[locale]} /><div className="module-actions"><span><ShieldCheck size={15} />{locale === 'fa' ? 'هیچ اتصال خارجی با ذخیره این فرم ایجاد نمی‌شود.' : 'Saving this form creates no external connection.'}</span><button className="ghost-button" onClick={() => setValue('')}>{locale === 'fa' ? 'پاک‌کردن' : 'Clear'}</button><button className="primary-button" onClick={save}><Database size={15} />{locale === 'fa' ? 'ذخیره' : 'Save'}</button></div></div></section></>;
}

function SecurityView({ locale }: { locale: Locale }) {
  const rows = locale === 'fa' ? [
    ['رمزها و کلیدها', 'رمزنگاری سیستم‌عامل؛ هرگز در Renderer یا لاگ برگردانده نمی‌شوند'],
    ['مرورگر و مجوزها', 'پنجره جدید، ناوبری ناخواسته و مجوزهای Electron به‌صورت پیش‌فرض مسدود است'],
    ['Claude آزمایشی', 'خاموش به‌صورت پیش‌فرض؛ بدون خواندن کوکی یا فایل اعتبارنامه'],
    ['بررسی API', 'فقط endpoint خواندنی؛ بدون تولید محتوا و بدون هزینه آزمایشی'],
  ] : [
    ['Passwords and keys', 'OS encryption; never returned to the renderer or logs'],
    ['Browser and permissions', 'New windows, unexpected navigation and Electron permissions are denied by default'],
    ['Experimental Claude', 'Off by default; no cookie or credential-file reading'],
    ['API verification', 'Read-only endpoints only; no generation or test charge'],
  ];
  return <><ViewHeading icon={ShieldCheck} title={locale === 'fa' ? 'امنیت و مجوزها' : 'Security & permissions'} description={locale === 'fa' ? 'مرزهای امنیتی فعال برنامه را یک‌جا ببینید.' : 'Review the app’s active security boundaries.'} /><section className="panel security-grid">{rows.map(([title, detail]) => <article key={title}><ShieldCheck size={19} /><div><strong>{title}</strong><p>{detail}</p></div><Check size={16} /></article>)}</section></>;
}

function SettingsView({ locale, theme, onLocale, onTheme, onConnections, onRefresh, onNotice }: { locale: Locale; theme: Theme; onLocale: (locale: Locale) => void; onTheme: (theme: Theme) => void; onConnections: () => void; onRefresh: () => void; onNotice: (message: string) => void }) {
  return <><ViewHeading icon={Settings} title={locale === 'fa' ? 'تنظیمات' : 'Settings'} description={locale === 'fa' ? 'انتخاب‌ها بلافاصله روی این دستگاه ذخیره می‌شوند و پس از بستن برنامه باقی می‌مانند.' : 'Preferences are saved on this device immediately and survive app restarts.'} />
    <div className="settings-grid"><section className="panel settings-card"><PanelHeader icon={Globe2} title={locale === 'fa' ? 'زبان و جهت' : 'Language & direction'} /><div className="settings-body"><p>{locale === 'fa' ? 'زبان رابط را انتخاب کنید.' : 'Choose the interface language.'}</p><div className="choice-grid"><button className={locale === 'fa' ? 'active' : ''} onClick={() => onLocale('fa')}><strong>فارسی</strong><span>RTL</span></button><button className={locale === 'en' ? 'active' : ''} onClick={() => onLocale('en')}><strong>English</strong><span>LTR</span></button></div></div></section>
      <section className="panel settings-card"><PanelHeader icon={theme === 'dark' ? Moon : Sun} title={locale === 'fa' ? 'ظاهر' : 'Appearance'} /><div className="settings-body"><p>{locale === 'fa' ? 'پوسته روشن یا تیره را انتخاب کنید.' : 'Choose a light or dark theme.'}</p><div className="choice-grid"><button className={theme === 'dark' ? 'active' : ''} onClick={() => onTheme('dark')}><Moon size={17} /><strong>{locale === 'fa' ? 'تیره' : 'Dark'}</strong></button><button className={theme === 'light' ? 'active' : ''} onClick={() => onTheme('light')}><Sun size={17} /><strong>{locale === 'fa' ? 'روشن' : 'Light'}</strong></button></div></div></section>
      <section className="panel settings-card settings-wide"><PanelHeader icon={ShieldCheck} title={locale === 'fa' ? 'حساب‌ها و حریم خصوصی' : 'Accounts & privacy'} /><div className="settings-body settings-account"><div><strong>{locale === 'fa' ? 'ورود رسمی حساب یا اتصال API' : 'Official account sign-in or API connection'}</strong><p>{locale === 'fa' ? 'ورود حساب در صفحه رسمی سرویس انجام می‌شود؛ رمز عبور هرگز وارد SynapseDock نمی‌شود.' : 'Account authentication happens on the provider’s official page; passwords never enter SynapseDock.'}</p></div><button className="primary-button" onClick={onConnections}><Network size={16} />{locale === 'fa' ? 'ورودهای اشتراکی' : 'Subscription sign-ins'}</button></div></section>
      <div className="settings-wide"><h2 className="connection-section-title">{locale === 'fa' ? 'اتصال مستقیم ارائه‌دهنده از تنظیمات' : 'Connect a provider directly from Settings'}</h2><ApiConnectionForm locale={locale} onRefresh={onRefresh} onNotice={onNotice} /></div></div>
  </>;
}

function TaskModal({ locale, onClose, onCreated }: { locale: Locale; onClose: () => void; onCreated: (s: WorkspaceSnapshot) => void }) {
  const t = labels[locale]; const [title, setTitle] = useState(''); const [goal, setGoal] = useState(''); const [freeOnly, setFreeOnly] = useState(true); const [busy, setBusy] = useState(false);
  async function submit() { setBusy(true); try { onCreated(await window.desktop.createTask({ title, goal, freeOnly })); } finally { setBusy(false); } }
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="modal"><div className="modal-title"><div><span className="modal-icon"><Sparkles size={18} /></span><div><h2>{t.newTask}</h2><p>{locale === 'fa' ? 'وظیفه در صف پایدار ذخیره می‌شود.' : 'This task will be stored in the persistent queue.'}</p></div></div><button onClick={onClose}><X size={19} /></button></div><label>{t.title}<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus /></label><label>{t.goal}<textarea value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={4000} rows={5} /></label><label className="check-row"><input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} /><span><strong>{t.free}</strong><small>{locale === 'fa' ? 'هیچ API پولی بدون اجازه انتخاب نشود' : 'Never select a paid API without consent'}</small></span></label><div className="modal-actions"><button className="ghost-button" onClick={onClose}>{t.cancel}</button><button className="primary-button" disabled={busy || !title.trim() || !goal.trim()} onClick={submit}>{busy ? <RefreshCw className="spin" size={16} /> : <Plus size={16} />}{t.create}</button></div></div></div>;
}

function ProviderRow({ account, locale }: { account: ProviderAccount; locale: Locale }) {
  const measured = account.quotaWindows.filter((w) => typeof w.usedPercent === 'number').sort((a, b) => b.usedPercent! - a.usedPercent!)[0];
  return <div className="provider-row"><ProviderLogo provider={account.provider} /><div className="provider-name"><strong>{account.displayName}</strong><span>{account.model}</span></div><div className="provider-quota"><QuotaMeter value={measured?.usedPercent} /><small>{measured?.usedPercent == null ? labels[locale].unknown : `${localNumber(measured.usedPercent, locale)}%`}</small></div><StatusBadge account={account} locale={locale} /></div>;
}

function ProviderLogo({ provider }: { provider: string }) { return <div className={`provider-logo ${providerTone[provider] ?? 'slate'}`}>{provider === 'ollama' ? <Cpu size={18} /> : provider === 'mock' ? <Sparkles size={18} /> : <Bot size={18} />}</div>; }
function StatusBadge({ account, locale }: { account: ProviderAccount; locale: Locale }) { const words: Record<string, [string, string]> = { available: ['آماده', 'Available'], limited: ['محدود', 'Limited'], exhausted: ['تمام‌شده', 'Exhausted'], 'reset-pending': ['انتظار بازنشانی', 'Reset pending'], unknown: ['نامشخص', 'Unknown'], revoked: ['لغوشده', 'Revoked'] }; return <span className={`status-badge ${account.availability}`}>{account.connected ? <span className="status-mini-dot" /> : null}{words[account.availability]?.[locale === 'fa' ? 0 : 1]}</span>; }
function QuotaMeter({ value }: { value?: number }) { return <div className={`quota-meter ${value == null ? 'unknown' : value >= 95 ? 'danger' : value >= 85 ? 'warning' : ''}`}><i style={{ width: value == null ? '0%' : `${value}%` }} /></div>; }
function PanelHeader({ icon: Icon, title, action, onAction }: { icon: typeof Activity; title: string; action?: string; onAction?: () => void }) { return <div className="panel-header"><div><span className="panel-icon"><Icon size={16} /></span><h2>{title}</h2></div>{action && <button onClick={onAction}>{action}<ChevronLeft size={14} /></button>}</div>; }
function ViewHeading({ icon: Icon, title, description }: { icon: typeof Activity; title: string; description: string }) { return <div className="view-heading"><span><Icon size={22} /></span><div><h1>{title}</h1><p>{description}</p></div></div>; }
function ResetTimeline({ accounts, locale }: { accounts: ProviderAccount[]; locale: Locale }) { const t = labels[locale]; const events = useMemo(() => accounts.flatMap((account) => account.quotaWindows.filter((w) => w.resetAt).map((w) => ({ account, at: w.resetAt! }))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(0, 4), [accounts]); return <section className="panel timeline-panel"><PanelHeader icon={Clock3} title={t.timeline} />{events.length ? <div className="timeline">{events.map((event, index) => <div className="timeline-event" key={`${event.account.id}-${event.at}`}><div className="timeline-line"><i>{index + 1}</i></div><ProviderLogo provider={event.account.provider} /><div><strong>{event.account.displayName}</strong><span>{formatDate(event.at, locale)}</span></div><small>{event.account.simulation ? 'MOCK' : 'VERIFIED'}</small></div>)}</div> : <p className="empty-small">{t.noReset}</p>}</section>; }
function Loading() { return <div className="loading"><div className="loader-orb"><Sparkles size={24} /></div><span>Loading workspace…</span></div>; }

function localNumber(value: number, locale: Locale) { return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(value); }
function formatDate(value: string, locale: Locale) { return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function formatRelative(value: string, locale: Locale) { const minutes = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60_000)); if (minutes < 1) return locale === 'fa' ? 'همین حالا' : 'just now'; return locale === 'fa' ? `${localNumber(minutes, locale)} دقیقه پیش` : `${minutes}m ago`; }
