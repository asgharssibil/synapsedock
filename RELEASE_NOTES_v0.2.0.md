# SynapseDock v0.2.0

This release expands SynapseDock from four visible providers into a secure multi-provider connection workspace and activates the previously disabled local modules.

## Highlights

- Official Sign in with ChatGPT through system-browser OAuth, PKCE, loopback callback validation, OIDC discovery, JWKS signature verification, and OS-encrypted token storage
- Opt-in experimental Claude Pro/Max bridge through the official Claude Code CLI
- Claude bridge is disabled by default and verifies with Safe Mode, no tools, no MCP, one turn, no session persistence, and API-key variables removed
- 16-provider API catalog available from both Connections and Settings
- Added Kimi/Moonshot, Mistral, Cohere, DeepSeek, OpenRouter, Groq, Together AI, Hugging Face, Replicate, Stability AI, Runway, ElevenLabs, and Anthropic API
- Image/video/audio providers are represented honestly by their official API paths; connection checks never trigger paid generation
- Agents, Automations, MCP configuration, Memory, and Security sidebar items are now usable local workspaces instead of disabled placeholders
- Existing databases automatically receive the expanded provider catalog without losing saved tasks or connections

## Verification performed

- 62 tests pass with enforced coverage: 81.9% statements, 70.94% branches, 83.33% functions, 89.1% lines
- Production TypeScript and Vite builds pass
- Electron end-to-end verifies renderer, typed preload/IPC, 19-account database migration, SQLite restart recovery, screenshots, and OS credential encryption/decryption
- The Windows installer was installed into a fresh directory, the installed executable passed the smoke suite, credentials decrypted after storage, and the uninstaller exited successfully

## Important boundaries

- Consumer web subscriptions are not treated as API credit. ChatGPT plan usage depends on OpenAI eligibility and Claude subscription use is routed only through the official Claude Code login.
- The SynapseDock-to-Claude bridge is unofficial and may break when the CLI changes. It never reads browser cookies or Claude credential files.
- API checks verify credentials against official read-only endpoints. They do not prove generation, regional availability, remaining credit, or quota percentages unless the provider explicitly returns those fields.
- Agents, Automations, MCP, and Memory in this release persist local definitions; unattended execution is not silently enabled.
- The installer remains unsigned, so Windows SmartScreen can show **Unknown publisher**. Verify the published SHA-256 checksum before running it.
