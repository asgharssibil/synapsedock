# SynapseDock — delivery report

Project root:

`C:\Users\mahdi\Documents\Codex\2026-10-28\files-pasted-by-the-user-c`

## Delivered in v0.1.0

- Secure Electron + React + TypeScript desktop foundation
- Persian/English, RTL/LTR, dark/light professional dashboard
- SQLite persistence for providers, tasks, checkpoints, activity, settings, and external-operation idempotency
- OS-encrypted credential vault
- Provider-agnostic quota and failover engines
- Real credential/model-discovery checks for OpenAI, Gemini, xAI, and local Ollama
- Explicit mock lab for quota/failover/recovery without confusing simulation with real service access
- Persistent task queue and close/reopen recovery test
- Architecture, compatibility, security, and continuation documentation
- Installable Windows x64 NSIS setup with embedded custom icon
- Desktop and Start Menu shortcuts plus a clean uninstaller
- GitHub CI for Windows tests, coverage, production build, and dependency audit
- Tag-based GitHub Release workflow that tests, packages, hashes, and uploads the Setup executable
- Issue template, pull-request template, changelog, release notes, contribution guide, and security policy

## Verification observed

- Strict TypeScript renderer and Electron typecheck: passed
- Unit/integration/UI/security tests: 36 passed across 7 files
- Coverage: 81.32% statements, 73.28% branches, 81.51% functions, 89.71% lines
- All 12 requested failover/recovery acceptance scenarios have named passing tests
- Production renderer + Electron build: passed
- Dependency audit: 0 vulnerabilities
- Electron 45.1.0 E2E: passed twice with a shared isolated database
- Real E2E verified renderer, preload, IPC, SQLite restart recovery, screenshots, and OS credential encryption
- Visual inspection passed in Dark/RTL Persian and Light/LTR English
- Published GitHub Windows installer build: passed (137,650,361 bytes)
- Isolated silent install to a custom directory: passed with exit code 0
- Installed application E2E: passed twice with SQLite restart persistence
- Installed EXE metadata and embedded icon: passed
- Desktop and Start Menu shortcut targets: passed
- Silent uninstall and shortcut cleanup: passed with exit code 0
- Published GitHub installer SHA-256: `FBAADD858F3B9D3C6ECBF55E4083284427B46D49E51BA6830A5D1AD294BDB19D`
- The separately built local installer was fully installed, launched twice, and uninstalled; its SHA-256 is `622E6F9AA4EDBD89B95B91837A430445B8A4BE04E6D7EF51EB23CF7EB596BB53`
- Local Ollama discovered `qwen3:8b`, but inference failed in the external runtime; availability remains `Unknown` rather than being falsely reported as ready

## Install on Windows

Run `SynapseDock-Setup-0.1.0.exe`. This x64 installer is not digitally signed, so Windows SmartScreen may display an **Unknown publisher** warning. Verify the SHA-256 above before running it.

## Run from source

```powershell
cd C:\Users\mahdi\Documents\Codex\2026-10-28\files-pasted-by-the-user-c
npm install
npm test
npm run dev
```

No provider key is required for the mock scenarios. Add a real key only inside the Connections screen.
