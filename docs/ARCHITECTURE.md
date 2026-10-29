# Architecture

## Final technology choice

Electron + React + TypeScript was selected for the first executable because the current Windows environment has Node.js but no Rust toolchain. The renderer is a sandboxed UI, the Electron main process is the trusted system boundary, and domain logic has no Electron dependency. SQLite runs through `sql.js`, avoiding a native ABI dependency while retaining a real SQLite file.

```text
Sandboxed React renderer
        │ typed, allow-listed IPC
        ▼
Electron main process ── CredentialVault (OS safeStorage)
        │
        ├── WorkspaceDatabase (SQLite)
        ├── Provider chat adapters (official API / subscription / local)
        ├── Project file + bounded command workspace
        ├── Persistent task & checkpoint services
        └── External-operation idempotency ledger
                │
                ▼
        Provider-agnostic domain core
        (quota assessment + failover routing)
```

## Trust boundaries

1. The renderer never receives raw credentials and has no Node.js access.
2. IPC names and payloads are allow-listed and validated in the main process.
3. Provider responses are data, never executable instructions.
4. External side effects require an idempotency key and reconciliation when the outcome is unknown.
5. Mock data has `simulation: true` and source `mock-simulation` all the way to the UI.

## Provider adapter contract (target)

Every adapter reports identity, connection method, model capabilities, health, streaming support, normalized errors, and quota signals with source/confidence. Absence of quota telemetry is represented as unknown, never inferred into a percentage. Official API, official subscription, local runtime, and optional experimental connectors remain separate connection classes.

## Persistent continuity

Tasks, checkpoints, retry timestamps, and external-operation states live in SQLite. A checkpoint payload has a schema version and will grow to contain relevant conversation, project state, changed files, test results, permissions, and remaining steps. A provider switch is allowed only after a checkpoint when work is already in progress.

## Next architectural slices

1. Worker process and OS startup scheduling for true background auto-resume.
2. Streaming provider contract and normalized token/usage reporting.
3. Git integration, richer file policy, diff review, and tool-capability manifests.
4. MCP client/server registry with OAuth and explicit per-tool grants.
5. Email and browser integrations behind idempotency and approval gates.
