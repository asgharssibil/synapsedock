# Changelog

All notable changes to SynapseDock are documented here.

## [0.1.0] - 2026-10-28

### Added

- Secure Electron, React, and TypeScript desktop foundation
- Persian/English and RTL/LTR interface with dark/light themes
- SQLite persistence for tasks, checkpoints, providers, settings, and activity
- OS-backed encrypted credential storage
- Quota-aware provider selection and failover simulation lab
- Read-only connection verification for OpenAI, Gemini, xAI, and Ollama
- Windows x64 NSIS installer with custom icon, Desktop shortcut, Start Menu shortcut, and uninstaller
- Unit, integration, security, UI, and Electron E2E test coverage

### Known limitations

- The installer is not digitally signed and may trigger Windows SmartScreen.
- Mock providers demonstrate routing behavior; they are not real service connections.
- Several product areas remain explicitly labelled as in development.
