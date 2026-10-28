# Contributing

## Development setup

Requirements: Windows 10/11, Node.js 20 or newer, and npm.

```powershell
npm ci
npm run test:coverage
npm run build
npm run dev
```

Run the real Electron smoke test before submitting changes that affect the main process, preload bridge, persistence, credentials, or renderer startup:

```powershell
npm run test:e2e
```

## Pull requests

- Keep changes focused and include tests for behavior changes.
- Preserve the security boundary: sandboxed renderer, context isolation, no renderer Node integration, and deny-by-default permissions.
- Never commit API keys, tokens, credentials, `.env` files, databases, build directories, or generated installers.
- Clearly distinguish simulations from real provider connections.
- Update `CHANGELOG.md` when a user-visible behavior changes.

## Building a Windows release

```powershell
npm run release:win
```

The installer and checksum are placed in `outputs/`. Installer binaries belong in GitHub Releases, not in Git history.
