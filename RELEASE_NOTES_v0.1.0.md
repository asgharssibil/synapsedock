# SynapseDock v0.1.0

The first Windows desktop foundation release of SynapseDock.

## Highlights

- Installable Windows 10/11 x64 desktop application
- Persian/English interface with RTL/LTR and dark/light modes
- Local SQLite persistence for tasks, checkpoints, providers, and settings
- OS-backed encryption for saved API credentials
- Provider-independent quota and failover decision engine
- Explicit simulation lab for exhaustion, waiting, reset, and recovery scenarios
- Read-only connection checks for OpenAI, Gemini, xAI, and local Ollama
- Custom application icon and standard Windows installer/uninstaller flow

## Verified release behavior

- 36/36 automated tests pass
- Production TypeScript and Vite build passes
- Real Electron E2E passes across two launches with SQLite restart persistence
- Installed application renderer, preload, IPC, and credential encryption pass
- Desktop and Start Menu shortcuts are created and removed correctly
- Dependency audit reports zero known vulnerabilities at release time

## Important notes

The installer is currently unsigned. Windows SmartScreen may show **Unknown publisher**. Compare the downloaded installer against the included `SHA256SUMS.txt` before running it.

Mock-provider scenarios do not represent live model access. Real paid-provider inference was not exercised without user credentials and consent. Features marked **In development** are not claimed as complete.
