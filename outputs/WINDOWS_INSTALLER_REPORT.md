# SynapseDock v0.1.0 — Windows installer

## Installer

- File: `SynapseDock-Setup-0.1.0.exe`
- Target: Windows 10/11 x64
- Type: per-user NSIS installer with selectable install directory
- Published GitHub asset size: 137,650,361 bytes
- Published GitHub SHA-256: `FBAADD858F3B9D3C6ECBF55E4083284427B46D49E51BA6830A5D1AD294BDB19D`
- Fully installed local build SHA-256: `622E6F9AA4EDBD89B95B91837A430445B8A4BE04E6D7EF51EB23CF7EB596BB53`
- Authenticode: not signed

Because this build is not code-signed, Windows SmartScreen may show **Unknown publisher**. Verify the SHA-256 above before running it.

## Installation verification

The final Setup executable was installed silently into an isolated custom directory and tested as an installed application, not only from source.

- Installer exit code: 0
- Application executable present: yes
- Uninstaller present: yes
- Desktop shortcut created with valid target: yes
- Start Menu shortcut created with valid target: yes
- App metadata: product `SynapseDock`, version `0.1.0`
- Custom icon embedded in installed EXE: yes
- Packaged ASAR and additional icon resource present: yes
- Installed app launched twice: yes
- Renderer mounted: yes
- Preload/IPC task round-trip: yes
- SQLite restart persistence: 0→1 task, then 1→2 tasks
- OS credential encryption with plaintext absence: yes
- Renderer screenshot: valid on both launches
- Silent uninstaller exit code: 0
- Installed executable removed: yes
- Desktop and Start Menu shortcuts removed: yes

Test date: 2026-10-28 (Asia/Tehran)

## Icon generation

The icon was generated with the built-in image-generation tool in `logo-brand` mode, then converted into a multi-size Windows `.ico` and embedded in the executable.

Prompt summary: a premium abstract AI spark combined with four modular workspace panes, deep indigo/electric violet/cyan palette, crisp silhouette, subtle glass depth, transparent background, no text or border, recognizable at small Windows icon sizes.
