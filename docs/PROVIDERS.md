# Provider connection catalog

Reviewed against official documentation on 2026-10-29. SynapseDock verifies credentials with read-only official endpoints. It does not send a generation request during connection, so a successful check confirms authentication but not model inference, regional availability, credit balance, or future compatibility.

| Provider | Main media | Credential | Read-only verification |
|---|---|---|---|
| OpenAI | Text, code, vision | API key | Models |
| Anthropic Claude API | Text, code, vision | API key | Models |
| Google Gemini | Text, code, vision | API key | Models |
| xAI / Grok | Text, code, vision | API key | Models |
| Mistral AI | Text, code, vision | API key | Models |
| Cohere | Text, RAG, rerank | API key | Models |
| DeepSeek | Text, code, vision input | API key | Models |
| Kimi / Moonshot | Text, code, image/video input | API key | Models |
| OpenRouter | Multi-provider gateway | API key | Current key metadata |
| GroqCloud | Text, code, speech | API key | Models |
| Together AI | Text, code, image | API key | Models |
| Hugging Face | Text, image, audio, video models | Access token | Current user |
| Replicate | Image, video, audio, text models | API token | Current account |
| Stability AI | Image, audio | API key | Credit balance |
| Runway | Image, video, avatars, audio | API key | Organization metadata |
| ElevenLabs | Voice, speech, music, sound effects | API key | Current user/subscription |

The catalog intentionally distinguishes API access from consumer web subscriptions. A ChatGPT or Claude web-plan sign-in does not imply API credit, and API keys do not grant access to a consumer subscription.

## Primary references

- [Anthropic model API](https://docs.anthropic.com/en/api/models-list)
- [Mistral models endpoint](https://docs.mistral.ai/api/endpoint/models)
- [Cohere model list](https://docs.cohere.com/v2/reference/list-models)
- [DeepSeek model list](https://api-docs.deepseek.com/api/list-models/)
- [Kimi API overview](https://www.kimi.ai/help/kimi-api/api-overview)
- [OpenRouter current-key endpoint](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-key)
- [Groq models endpoint](https://console.groq.com/docs/api-reference)
- [Hugging Face Hub API](https://huggingface.co/docs/hub/en/api)
- [Replicate HTTP API](https://replicate.com/docs/reference/http/)
- [Stability AI authentication](https://platform.stability.ai/docs/getting-started)
- [Runway API reference](https://docs.dev.runwayml.com/api/)
- [ElevenLabs authentication](https://elevenlabs.io/docs/api-reference/authentication)

No browser-cookie scraping, consumer-session token extraction, or authentication bypass is used for any provider.
