<p align="center">
  <img src="assets/app-icon.png" width="112" alt="SynapseDock icon">
</p>

<h1 align="center">SynapseDock</h1>

<p align="center">
  Multi-provider AI chat and a real local coding workspace for Windows.
</p>

<p align="center">
  <a href="https://github.com/asgharssibil/synapsedock/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/asgharssibil/synapsedock/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/asgharssibil/synapsedock/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/asgharssibil/synapsedock?display_name=tag"></a>
  <a href="https://github.com/asgharssibil/synapsedock/releases"><img alt="GitHub downloads" src="https://img.shields.io/github/downloads/asgharssibil/synapsedock/total?logo=github"></a>
  <a href="https://github.com/asgharssibil/synapsedock/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/asgharssibil/synapsedock?style=flat&logo=github"></a>
  <img alt="Windows 10 and 11" src="https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4?logo=windows">
  <img alt="Proprietary license" src="https://img.shields.io/badge/license-proprietary-6c5ce7">
</p>

<p align="center">
  <a href="https://github.com/asgharssibil/synapsedock/releases/download/v0.3.0/SynapseDock-Setup-0.3.0.exe"><img alt="Download SynapseDock for Windows" src="https://img.shields.io/badge/Download_for_Windows-v0.3.0-6C5CE7?style=for-the-badge&logo=windows"></a>
</p>

![SynapseDock social preview](assets/marketing/social-preview.jpg)

SynapseDock is a bilingual Windows desktop app for chatting with multiple AI providers and working directly on local code projects. Connect ChatGPT, Claude, official text APIs, or Ollama; then use one workspace for conversations, files, editing, commands, persistent tasks, quota state, and recovery experiments.

![SynapseDock product tour](assets/marketing/demo.gif)

## Why SynapseDock?

- **One AI chat surface** — switch between ChatGPT, Claude, OpenAI-compatible APIs, Gemini, Cohere, and local Ollama without changing apps.
- **A project-aware coding workspace** — browse, create, edit, save, and run local files with a project-scoped PowerShell terminal.
- **Ask AI about the active file** — hand code from the editor to the chat composer without copying it manually.
- **One operational view** — provider readiness, quota state, tasks, checkpoints, and recent activity at a glance.
- **Persistent by default** — SQLite-backed tasks and recovery records survive restarts.
- **Resilience lab** — test exhaustion, waiting, failover, and recovery flows without spending API credits.
- **Local-first security** — credentials use Electron `safeStorage`; the renderer is sandboxed and has no Node.js access.
- **Bilingual desktop UI** — switch between Persian/RTL and English/LTR, in dark or light mode.
- **Provider-backed AI chat** — talk to connected ChatGPT, Claude, official text APIs, or local Ollama from one persistent desktop composer.
- **Real coding workspace** — open a project folder, browse and edit files, run supported files, use a project-scoped PowerShell terminal, and send the active file to AI chat.
- **Consent-aware routing** — free-only tasks never select paid providers without explicit configuration and consent.

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="assets/marketing/chat-workspace.png" alt="SynapseDock multi-provider AI chat workspace in Persian"></td>
    <td width="50%"><img src="assets/marketing/code-workspace.png" alt="SynapseDock coding workspace with file explorer, editor and terminal"></td>
  </tr>
  <tr>
    <td align="center">Multi-provider AI chat</td>
    <td align="center">Project files · editor · terminal</td>
  </tr>
</table>

## What works in v0.3.0

| Area | Implemented |
| --- | --- |
| Desktop shell | Hardened Electron runtime with context isolation, renderer sandboxing, deny-by-default permissions, and blocked external navigation |
| Persistence | Local SQLite database for accounts, tasks, checkpoints, activity, settings, and idempotency records |
| Credentials | OS-backed encrypted storage through Electron `safeStorage` |
| Routing model | Provider-agnostic quota assessment, free-only policy, and failover selection |
| Testing lab | Mock quota, exhaustion, waiting, failover, reset, and recovery scenarios |
| Account sign-in | Official ChatGPT system-browser OAuth/PKCE plus an opt-in experimental bridge to the official Claude Code CLI |
| Connection checks | Read-only verification for 16 official APIs spanning text/code, image/video and audio, plus local Ollama |
| AI chat | Real provider requests through ChatGPT plan access, Claude Code subscription, 12 text API adapters, and local Ollama; local conversation continuity and editable model selection |
| Experience | Persian/English, RTL/LTR, dark/light, installer shortcuts, and clean uninstall |
| Preferences | Persistent language and theme settings with a compact-height-safe sidebar |
| Coding | Persistent project folder, bounded file explorer, real file read/write, JS/Python/PowerShell/TypeScript launch commands, project terminal, and Ask AI handoff |
| Local modules | Clickable Agents, Automations, MCP configuration, Memory, and Security workspaces with on-device persistence |

> [!IMPORTANT]
> Mock providers are simulations, not real service connections. SynapseDock does not claim access to consumer web subscriptions, and it displays `Unknown` whenever a provider does not expose an exact quota value.

### New in v0.3.0

- Chat is now a primary workspace rather than a connection dashboard: it includes provider/model selection, local conversation history, multiline code-aware messages, and real responses.
- The coding workspace now operates on an explicitly selected folder with path traversal protection, a file explorer, editor, save/create actions, command output, a 60-second process limit, and direct handoff to AI chat.
- Provider credentials remain in the Electron main process; neither API keys nor ChatGPT tokens are returned to the renderer.

### Added in v0.2.0

- Official **Sign in with ChatGPT** through system-browser OAuth/PKCE. Account eligibility still controls whether plan usage is granted.
- An opt-in **experimental Claude Code bridge**. It invokes Anthropic's official CLI after the user signs in on Claude's official page; SynapseDock does not read Claude cookies, passwords, or stored tokens.
- Claude verification runs one fixed prompt with Safe Mode, all tools disabled, MCP denied, one turn, no session persistence, and API-key environment variables removed. The bridge is disabled by default and the verification request may consume subscription usage.
- A **16-provider connection catalog** for text/code, image/video, and audio services, available from both Connections and Settings. It includes Kimi, Mistral, Cohere, DeepSeek, OpenRouter, Groq, Together, Hugging Face, Replicate, Stability AI, Runway, and ElevenLabs in addition to the original four.
- Agents, Automations, MCP configuration, Memory, and Security are now clickable local workspaces rather than disabled sidebar placeholders. Saving these local definitions does not silently start external work.

SynapseDock intentionally does not implement browser-cookie scraping, consumer-session token extraction, client impersonation, or authentication bypass.

See the [provider catalog](docs/PROVIDERS.md) for connection method, media type, verification boundary, and official references.

## Install on Windows

1. [Download `SynapseDock-Setup-0.3.0.exe`](https://github.com/asgharssibil/synapsedock/releases/download/v0.3.0/SynapseDock-Setup-0.3.0.exe).
2. Verify the installer against [`SHA256SUMS.txt`](https://github.com/asgharssibil/synapsedock/releases/download/v0.3.0/SHA256SUMS.txt).
3. Run the installer and choose the destination folder.

The current x64 installer is unsigned, so Windows SmartScreen may display an **Unknown publisher** warning. The published checksum file lets you verify the download before running it.

No API key is needed for the workspace or mock scenarios. Add credentials only through **Connections** inside SynapseDock; never commit them to source control.

## Run from source

Requirements: Windows 10 or 11, Node.js 20+, and npm.

```powershell
git clone https://github.com/asgharssibil/synapsedock.git
cd synapsedock
npm ci
npm run test:coverage
npm run test:e2e
npm run dev
```

Build the Windows installer locally with:

```powershell
npm run dist:win
```

## Verification

The automated suite covers routing decisions, quota states, provider response normalization, path containment, validation, persistence, security policy, and renderer behavior. Electron end-to-end tests launch the packaged runtime in isolated app-data directories and verify chat-provider discovery, project file read/write, terminal execution, renderer mounting, preload/IPC, SQLite restart recovery, screenshot generation, and OS-backed credential encryption.

## Project status and roadmap

SynapseDock v0.3.0 now provides real chat generation and a working local coding workspace. Autonomous background agents, unrestricted tool execution, streaming responses, Git operations, and media generation remain future work unless explicitly marked implemented.

- [Development state](DEVELOPMENT_STATE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Compatibility matrix](docs/COMPATIBILITY.md)
- [Security model](docs/SECURITY.md)
- [Release notes](RELEASE_NOTES_v0.3.0.md)

Found a bug or have a workflow SynapseDock should support? [Open an issue](https://github.com/asgharssibil/synapsedock/issues/new) with the Windows version, steps to reproduce, and expected behavior.

If SynapseDock is useful to you, starring the repository helps other Windows and AI-tool users discover it. Feature ideas are welcome through the guided [feature request form](https://github.com/asgharssibil/synapsedock/issues/new?template=feature_request.yml).

## License

SynapseDock is publicly visible but proprietary software. Copyright is retained by the owner; copying, modification, redistribution, sublicensing, or sale requires prior written permission. See [`LICENSE`](LICENSE).
