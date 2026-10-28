# SynapseDock v0.1.1

This release turns previously unclear navigation items into usable, persistent desktop features and adds the public launch assets.

## Highlights

- Working Settings page for language, direction, and dark/light appearance
- Language and theme preferences persist across application restarts
- Sidebar footer remains reachable at compact window heights
- Clear Accounts & privacy path into official provider connections
- Explicit guidance to use API keys—not website usernames or passwords
- Local coding scratchpad for TypeScript, Python, PowerShell, and plain text
- Code drafts persist locally; Ctrl+S and the Save locally button are supported
- Professional GitHub README, social preview, product GIF, and Persian launch kit

## Verified behavior

- Renderer tests cover settings persistence, account-key privacy, and code-draft persistence
- TypeScript/Vite production build passes
- Electron end-to-end verifies renderer, preload/IPC, SQLite restart recovery, screenshot capture, and OS credential encryption
- Windows NSIS installer is built from the same tagged source

## Important boundaries

The coding workspace is a local draft editor in this release. Terminal execution and direct project-file access are not implemented yet. Provider connections use official API keys; SynapseDock never asks for or stores website account passwords. Mock-provider scenarios remain simulations and do not represent live model access.

The installer is currently unsigned. Windows SmartScreen may show **Unknown publisher**; compare the installer with the included `SHA256SUMS.txt` before running it.
