# Security policy

## Supported version

Security fixes currently target the latest published release.

| Version | Supported |
|---|---|
| 0.1.x | Yes |

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability and do not include secrets in logs or screenshots. Use the repository's **Security → Report a vulnerability** private advisory flow.

Include the affected version, impact, minimal reproduction steps, and any suggested mitigation. Remove API keys, tokens, credentials, and personal data before submitting evidence.

## Credential handling

The application encrypts stored credentials through Electron `safeStorage`. Credentials must never be placed in source files, issues, pull requests, `.env` files committed to Git, or CI logs.
