# SynapseDock v0.1.0 — comprehensive test report

Test date: 2026-10-28 (Asia/Tehran)

## Final results

| Check | Result |
|---|---|
| Strict TypeScript typecheck | PASS |
| Production Vite + Electron build | PASS |
| Unit/integration/UI/security tests | 36/36 PASS |
| Required acceptance scenarios TEST 1–12 | PASS |
| Statement coverage | 81.32% |
| Branch coverage | 73.28% |
| Function coverage | 81.51% |
| Line coverage | 89.71% |
| Dependency audit | 0 vulnerabilities |
| Electron runtime | 45.1.0, SHA-256 verified |
| Real Electron E2E, first launch | PASS |
| Real Electron E2E, restart with same SQLite database | PASS |
| Renderer + preload + IPC round-trip | PASS |
| OS credential encryption; plaintext absence | PASS |
| Dark/RTL Persian visual inspection | PASS |
| Light/LTR English visual inspection | PASS |
| Windows x64 NSIS installer build | PASS |
| Installer SHA-256 verification | PASS |
| Isolated install to a custom directory | PASS, exit code 0 |
| Desktop + Start Menu shortcut creation and targets | PASS |
| Installed EXE version metadata (0.1.0) | PASS |
| Installed EXE embedded custom icon | PASS |
| Packaged ASAR and SQL.js runtime loading | PASS |
| Installed application E2E, first launch | PASS |
| Installed application E2E, restart with persisted SQLite | PASS |
| Installed app renderer + preload + IPC | PASS |
| Installed app OS credential encryption | PASS |
| Silent uninstall and shortcut cleanup | PASS, exit code 0 |
| Authenticode signature | NOT SIGNED — SmartScreen may warn |
| Local Ollama model discovery (`qwen3:8b`) | PASS |
| Local Ollama inference | FAIL — runtime forcibly closed the transport; app does not mark inference availability |

## Defects found and fixed during testing

1. Production `npm start` incorrectly attempted to load the development server and failed with `ERR_CONNECTION_REFUSED`. Development mode now requires an explicit environment flag.
2. Electron 45 reported deprecated synchronous `safeStorage` calls. Credential storage now uses the asynchronous encryption APIs.
3. A lookalike URL such as `localhost:5173.evil.example` could pass a prefix-style development navigation check. Navigation now parses and compares protocol, hostname, and port exactly.
4. A past quota reset could be reused while the provider was still exhausted. Routing now schedules a future backoff and requires access re-verification.
5. Compiled CommonJS test output was rediscovered by Vitest after a build. Test discovery now excludes generated directories.

## Honest boundary

This is comprehensive verification of the implemented v0.1.0 foundation. Real OpenAI/Gemini/xAI inference was not tested because no user credentials were supplied, and it would be unsafe to create paid usage without consent. Features still labelled “In development” are not claimed as implemented or tested.

The installed Ollama runtime exposed `qwen3:8b` through model discovery, but a minimal generation request failed when the runtime forcibly closed the connection and then stopped answering health calls. The application therefore retains `Unknown` availability after discovery instead of claiming successful inference.

## Windows installer artifact

- File: `SynapseDock-Setup-0.1.0.exe`
- Published GitHub asset size: 137,650,361 bytes
- Published GitHub SHA-256: `FBAADD858F3B9D3C6ECBF55E4083284427B46D49E51BA6830A5D1AD294BDB19D`
- Fully installed local build SHA-256: `622E6F9AA4EDBD89B95B91837A430445B8A4BE04E6D7EF51EB23CF7EB596BB53`
- Target: Windows x64, per-user NSIS installer
- Signature: unsigned
