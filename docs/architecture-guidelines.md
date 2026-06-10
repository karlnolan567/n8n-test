# Architecture Guidelines

Use this document as the source of truth for the Code Companion RAG tool. Ingest it with workflow **06c - Ingest Architecture Docs**.

## Layering

- **Presentation**: HTTP handlers, webhooks, UI — no business logic.
- **Service**: orchestration, validation, domain rules.
- **Data**: repositories, external API clients, database access.

Dependencies flow inward only: presentation → service → data.

## API Design

- REST paths use kebab-case plural nouns (`/api/v1/pull-requests`).
- Return consistent error envelopes: `{ "error": { "code", "message", "details" } }`.
- Version breaking changes under a new path prefix (`/api/v2/...`).

## Error Handling

- Never swallow exceptions silently.
- Log with correlation IDs at service boundaries.
- User-facing messages must not leak stack traces or secrets.

## Security

- Secrets live in environment variables or a secret manager — never in source control.
- Validate and sanitize all external input at the service layer.
- Use least-privilege tokens for GitHub, database, and third-party APIs.

## Testing

- Unit tests for service-layer logic.
- Integration tests for HTTP endpoints and database adapters.
- PRs that change public APIs require updated docs and at least one test.

## n8n Workflows (this project)

- Workflows live in `workflows/` and are auto-imported on first Docker start.
- Ollama is reached inside n8n as `http://ollama:11434`.
- Qdrant is reached as `http://qdrant:6333`.
- Prefer sub-workflow tools over complex inline HTTP Request tools for agent reliability.

## Compliance Scoring Rubric

When triaging issues or PRs, score architecture compliance 0–100:

| Score | Meaning |
|-------|---------|
| 90–100 | Fully aligned with guidelines; minor nits only |
| 70–89 | Mostly aligned; one or two notable gaps |
| 50–69 | Mixed; structural or security concerns |
| 0–49 | Major violations (layering, secrets, missing tests) |

Always cite which guideline sections apply to your score.
