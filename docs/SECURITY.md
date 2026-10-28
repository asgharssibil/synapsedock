# Security model

- Electron renderer uses `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, and `webSecurity: true`.
- Permission requests are denied by default. New-window creation is denied and unexpected navigation is blocked.
- The preload exposes only six typed operations; it does not expose `ipcRenderer`.
- Credentials are encrypted with Electron `safeStorage` and stored outside the repository in the app data directory. They are not returned to the renderer or written to logs.
- API-key verification uses official HTTPS endpoints. Ollama is restricted to loopback.
- Content Security Policy disallows remote scripts and remote images.
- External side effects use an idempotency ledger. `reserved` or `unknown-outcome` operations must be reconciled before retry.
- Paid use requires explicit configuration. A task can be marked free-only to exclude paid providers.

Known gaps before production distribution:

- Add signed installers, dependency/SBOM scanning, and code-signing verification.
- Move long-running provider calls into a constrained worker process.
- Add database backup/migration tests and optional encryption for non-credential sensitive content.
- Add OAuth PKCE flows and strict callback-origin validation.
- Add prompt-injection classification at every untrusted tool/document boundary.
