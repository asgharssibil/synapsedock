# SynapseDock v0.3.0

This release turns SynapseDock from a provider dashboard into a usable multi-provider AI and coding desktop workspace.

## Highlights

- Primary AI chat with local conversation continuity, provider/model selection, and real provider responses
- ChatGPT plan calls through the existing OAuth connection without exposing tokens to the renderer
- Claude Pro/Max chat through the opt-in official Claude Code CLI bridge
- Text chat adapters for OpenAI, Anthropic, Gemini, xAI, Mistral, Cohere, DeepSeek, Kimi, OpenRouter, Groq, Together AI, Hugging Face, and local Ollama
- Real coding workspace with an explicitly selected project folder, file explorer, editor, file creation and save actions
- Project-scoped PowerShell terminal with bounded output and a 60-second process timeout
- One-click run commands for JavaScript, TypeScript, Python, and PowerShell files
- Send the active file and its contents directly into AI chat for review or completion

## Security boundaries

- Credentials and subscription tokens remain encrypted in the Electron main process and never enter the renderer.
- Workspace paths are resolved against the explicitly selected folder; absolute paths and traversal outside that folder are rejected.
- Files are limited to 2 MB and dependency/build trees are omitted from the explorer.
- Terminal commands run only after a user action, in the selected folder, and are never executed automatically from an AI response.

## Verification

- 77 unit/component tests with all project coverage thresholds met
- Strict renderer and Electron type checking
- Electron E2E covering provider discovery, file read/write, terminal execution, preload/IPC, SQLite restart persistence, screenshots, and encrypted credential round trips
- Visual QA of the Persian RTL chat and coding workspaces

The Windows installer is currently unsigned, so SmartScreen may show an Unknown publisher warning. Verify it with the accompanying `SHA256SUMS.txt` file.
