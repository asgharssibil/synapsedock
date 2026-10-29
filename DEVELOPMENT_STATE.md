# Development state

## Goal

Build a secure, provider-agnostic desktop AI workspace with persistent tasks, truthful quota telemetry, checkpointed failover, and safe external operations.

## Done

- Phase 1 foundation: Electron shell, bilingual responsive UI, SQLite schema, settings-ready local storage, tasks and activity.
- Phase 2 foundation: provider/account model plus real connection verification for OpenAI/Gemini/xAI/Ollama.
- Phase 3 core: normalized quota windows, threshold assessment, capability-aware failover, earliest verified reset, persistent checkpoints, mock lab.
- Security baseline: sandboxed renderer, constrained IPC, encrypted credentials, deny-by-default permissions.
- Provider-backed chat: ChatGPT OAuth, Claude subscription CLI, official text API adapters, and local Ollama.
- Coding workspace: selected-folder file explorer/editor, path containment, file persistence, run commands, terminal output, and chat handoff.
- Unit tests for 90% prepare, exhaustion failover, all-exhausted wait, unknown percentage, capability mismatch, and idempotency guard.

## Key decisions

- Electron selected because Rust/Tauri is unavailable in the current environment.
- `sql.js` provides portable SQLite without native Electron ABI rebuilds.
- Simulation and real connections are different records and UI labels.
- Consumer web subscriptions are never treated as API access by default.

## Verification

- `npm run typecheck` — passed (strict renderer and Electron main/preload checks).
- `npm run test:coverage` — 77 tests passed across 11 files; statement 80.22%, branch 70.36%, function 80.92%, line 89.59%.
- All 12 requested acceptance scenarios have named tests; persistence/idempotency scenarios also exercise SQLite close/reopen behavior.
- `npm run build` — passed; production renderer and Electron JavaScript emitted.
- `npm audit --audit-level=moderate` — passed with 0 vulnerabilities.
- `npm run test:e2e` — passed with Electron 45.1.0: two real launches, chat-provider discovery, project file read/write, terminal execution, renderer/preload/IPC, task persistence across restart, screenshots, and encrypted credential storage.
- Visual inspection — passed for Dark/RTL Persian and Light/LTR English captures at the real desktop window size.
- Electron release archive SHA-256 matched the official `SHASUMS256.txt` before extraction.

## Next actions

1. Add streaming responses, cancel controls, usage reporting, and multiple named conversation threads.
2. Add background worker/startup recovery and database migration/backup tests.
3. Implement Git diff/review, MCP execution grants, automation workers, email, and browser integrations.
