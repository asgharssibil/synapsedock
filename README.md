# SynapseDock

An executable Windows-first desktop foundation for persistent, quota-aware AI work. This is not presented as a finished universal client: implemented capabilities are kept separate from planned integrations, and mock-provider results are visibly marked as simulations.

## What works in v0.1.0

- Hardened Electron shell (`contextIsolation`, renderer sandbox, no Node integration, deny-by-default permissions)
- React/TypeScript UI with Persian/English and RTL/LTR switching
- Local SQLite database for provider accounts, tasks, checkpoints, activity, settings, and idempotency records
- OS-backed encrypted storage for API credentials through Electron `safeStorage`
- Provider-agnostic quota assessment and failover selection
- Persistent task queue and checkpoint records
- Mock failover lab for quota, exhaustion, wait, and recovery scenarios
- Real read-only connection verification for OpenAI API, Gemini API, xAI API, and local Ollama
- Free-only task policy; paid providers are not selected without explicit configuration/consent

## Run locally

Requirements: Windows 10+, Node.js 20+ and npm.

```powershell
npm install
npm test
npm run test:coverage
npm run test:e2e
npm run dev
```

Production build:

```powershell
npm run build
npm start
```

`test:e2e` launches the real Electron runtime twice in an isolated app-data directory and verifies renderer mounting, preload/IPC, SQLite restart recovery, screenshot generation, and OS-backed credential encryption.

## Install on Windows

Run `SynapseDock-Setup-0.1.0.exe`, choose the installation directory, and finish the wizard. The installer creates Desktop and Start Menu shortcuts and includes a clean uninstaller.

The current installer is an unsigned x64 build. Windows SmartScreen may therefore show an **Unknown publisher** warning. Verify its SHA-256 before running:

```text
622E6F9AA4EDBD89B95B91837A430445B8A4BE04E6D7EF51EB23CF7EB596BB53
```

To build the installer from source:

```powershell
npm run dist:win
```

## Publish on GitHub

The repository includes Windows CI and an automated tag-based release workflow. Push the source to GitHub, then push tag `v0.1.0`; GitHub Actions runs the test suite and Electron E2E, builds the x64 installer, generates `SHA256SUMS.txt`, and attaches both files to a GitHub Release.

The Setup executable is larger than GitHub's normal 100 MB file limit. It is intentionally ignored by Git and must be published as a Release asset. See the [Persian GitHub release guide](docs/GITHUB_RELEASE_FA.md) and [release notes](RELEASE_NOTES_v0.1.0.md).

SynapseDock is publicly visible but proprietary software. The included `LICENSE` grants no right to copy, modify, redistribute, sublicense, or sell the software without written permission from the copyright owner.

No API key is required to run the workspace or the mock tests. Add keys only through **Connections** inside the application; never commit them to `.env` or source files.

## Honest support boundary

- An API connection is not the same thing as a web subscription.
- Mock providers test routing behavior only; they do not prove a real service connection.
- Claude Free is not exposed as a direct programmable provider because no supported direct API path was established.
- ChatGPT-plan use belongs to the official Sign in with ChatGPT flow and its eligibility/contract; this build does not claim that OAuth flow as implemented yet.
- Exact quota percentages are shown only when a source supplies them. Otherwise the UI shows `Unknown`.

See [architecture](docs/ARCHITECTURE.md), [compatibility matrix](docs/COMPATIBILITY.md), [security model](docs/SECURITY.md), and [development state](DEVELOPMENT_STATE.md).
