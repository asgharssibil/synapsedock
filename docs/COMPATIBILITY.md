# Feature compatibility matrix

Reviewed against official documentation on 2026-10-28. “Implemented” means present in this repository; “real-tested” means an external account/runtime was actually verified, not mocked.

| Product / path | Official programmable path | Subscription quota usable by third-party app | Quota telemetry | Current implementation | Real-tested |
|---|---|---|---|---|---|
| OpenAI API | Responses/API with API credential | API billing is separate | Errors/headers and account surfaces; do not invent percentage | Credential verification + model discovery | No account supplied |
| Sign in with ChatGPT | OIDC/OAuth PKCE; eligible Responses requests | Eligible Plus/Pro in approved/open-source flow | User manages usage in ChatGPT; integration has preview limits | Documented, not yet wired | No |
| Claude / Anthropic API | Official API key | API billing is separate from Claude Free | API rate-limit signals | Planned adapter | No account supplied |
| Claude Code | Official CLI; Console billing or eligible Pro/Max login | Supported by Claude Code for documented plans | Use only supported CLI/status output | Capability slot only | No |
| Claude Free web | Official web UI | No supported direct third-party programmatic quota path established | Not exposed to this app | Intentionally unavailable | No |
| Gemini API | Official key/auth key and REST/SDK | API free tier is project-based, not Gemini web-chat quota | RPM/TPM/RPD and `429`; limits vary by project/model | Credential verification + model discovery | No account supplied |
| xAI API | Official API key and REST/SDK | Grok consumer subscription is not assumed to grant API access | Per-model RPS/TPM and `429` | Credential verification + model discovery | No account supplied |
| Ollama | Local HTTP API | Local compute; no cloud subscription | No percentage; local health/model list | Loopback discovery | Model discovery passed; inference failed because the local runtime closed the transport |
| MCP | Official protocol/SDKs | N/A | N/A | Architecture planned | No |
| Mock provider | In-process test fixture | N/A | Deterministic test windows | Implemented | Unit-tested only |

## Official references

- OpenAI: [Sign in with ChatGPT quickstart](https://developers.openai.com/siwc/quickstart), [preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- Anthropic: [Claude Code setup and authentication](https://docs.anthropic.com/en/docs/claude-code/getting-started), [Anthropic documentation](https://docs.anthropic.com/)
- Google: [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [Gemini API reference](https://ai.google.dev/api)
- xAI: [xAI rate limits](https://docs.x.ai/developers/rate-limits)
- MCP: [Model Context Protocol](https://modelcontextprotocol.io/), [TypeScript SDK authorization](https://ts.sdk.modelcontextprotocol.io/v2/serving/authorization)

No unsupported consumer-session scraping, token extraction, client impersonation, or authentication bypass is implemented.
