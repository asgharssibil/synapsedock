<p align="center">
  <img src="assets/app-icon.png" width="112" alt="SynapseDock icon">
</p>

<h1 align="center">SynapseDock</h1>

<p align="center">
  A Windows desktop workspace for persistent, quota-aware AI operations.
</p>

<p align="center">
  <a href="https://github.com/asgharssibil/synapsedock/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/asgharssibil/synapsedock/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/asgharssibil/synapsedock/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/asgharssibil/synapsedock?display_name=tag"></a>
  <img alt="Windows 10 and 11" src="https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4?logo=windows">
  <img alt="Proprietary license" src="https://img.shields.io/badge/license-proprietary-6c5ce7">
</p>

<p align="center">
  <a href="https://github.com/asgharssibil/synapsedock/releases/download/v0.1.1/SynapseDock-Setup-0.1.1.exe"><img alt="Download SynapseDock for Windows" src="https://img.shields.io/badge/Download_for_Windows-v0.1.1-6C5CE7?style=for-the-badge&logo=windows"></a>
</p>

![SynapseDock social preview](assets/marketing/social-preview.jpg)

SynapseDock keeps provider health, persistent tasks, quota state, checkpoints, and recovery experiments in one bilingual desktop workspace. The current release is an honest foundation: production-grade local storage and security are implemented, while mock providers and planned integrations are clearly identified.

![SynapseDock product tour](assets/marketing/demo.gif)

## Why SynapseDock?

- **One operational view** — provider readiness, quota state, tasks, checkpoints, and recent activity at a glance.
- **Persistent by default** — SQLite-backed tasks and recovery records survive restarts.
- **Resilience lab** — test exhaustion, waiting, failover, and recovery flows without spending API credits.
- **Local-first security** — credentials use Electron `safeStorage`; the renderer is sandboxed and has no Node.js access.
- **Bilingual desktop UI** — switch between Persian/RTL and English/LTR, in dark or light mode.
- **Local coding scratchpad** — write and keep code drafts on-device while terminal execution remains explicitly out of scope for this release.
- **Consent-aware routing** — free-only tasks never select paid providers without explicit configuration and consent.

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="outputs/ui-dark-fa-rtl.png" alt="Persian dark interface"></td>
    <td width="50%"><img src="outputs/ui-light-en-ltr.png" alt="English light interface"></td>
  </tr>
  <tr>
    <td align="center">Persian · RTL · dark</td>
    <td align="center">English · LTR · light</td>
  </tr>
</table>

## What works in v0.1.1

| Area | Implemented |
| --- | --- |
| Desktop shell | Hardened Electron runtime with context isolation, renderer sandboxing, deny-by-default permissions, and blocked external navigation |
| Persistence | Local SQLite database for accounts, tasks, checkpoints, activity, settings, and idempotency records |
| Credentials | OS-backed encrypted storage through Electron `safeStorage` |
| Routing model | Provider-agnostic quota assessment, free-only policy, and failover selection |
| Testing lab | Mock quota, exhaustion, waiting, failover, reset, and recovery scenarios |
| Connection checks | Read-only verification for OpenAI API, Gemini API, xAI API, and local Ollama |
| Experience | Persian/English, RTL/LTR, dark/light, installer shortcuts, and clean uninstall |
| Preferences | Persistent language and theme settings with a compact-height-safe sidebar |
| Coding | Local draft editor for TypeScript, Python, PowerShell, and plain text; execution is not yet implemented |

> [!IMPORTANT]
> Mock providers are simulations, not real service connections. SynapseDock does not claim access to consumer web subscriptions, and it displays `Unknown` whenever a provider does not expose an exact quota value.

## Install on Windows

1. [Download `SynapseDock-Setup-0.1.1.exe`](https://github.com/asgharssibil/synapsedock/releases/download/v0.1.1/SynapseDock-Setup-0.1.1.exe).
2. Verify the installer against [`SHA256SUMS.txt`](https://github.com/asgharssibil/synapsedock/releases/download/v0.1.1/SHA256SUMS.txt).
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

The automated suite covers routing decisions, quota states, validation, persistence, security policy, and renderer behavior. Electron end-to-end tests launch the packaged runtime in isolated app-data directories and verify renderer mounting, preload/IPC, SQLite restart recovery, screenshot generation, and OS-backed credential encryption.

## Project status and roadmap

SynapseDock v0.1.1 is an early desktop foundation, not a finished universal AI client. Near-term work focuses on provider integrations, observable long-running execution, stronger checkpoint recovery, code signing, and usability feedback from Windows users.

- [Development state](DEVELOPMENT_STATE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Compatibility matrix](docs/COMPATIBILITY.md)
- [Security model](docs/SECURITY.md)
- [Release notes](RELEASE_NOTES_v0.1.1.md)

Found a bug or have a workflow SynapseDock should support? [Open an issue](https://github.com/asgharssibil/synapsedock/issues/new) with the Windows version, steps to reproduce, and expected behavior.

## License

SynapseDock is publicly visible but proprietary software. Copyright is retained by the owner; copying, modification, redistribution, sublicensing, or sale requires prior written permission. See [`LICENSE`](LICENSE).
