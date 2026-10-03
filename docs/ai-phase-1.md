# AI Assistant Phase 1

## What was implemented

Phase 1 adds a protected backend-only LLM proof of concept. `POST /assistant` accepts a validated message and routes it through Vercel AI SDK and Cloudflare AI Gateway. It does not access ServiceFlow data, does not use MCP, does not expose a chat UI, and does not define tools.

The endpoint supports two response modes:

- Default JSON response: `{ "text": "..." }`.
- Plain-text streaming response when the request body includes `{ "stream": true }`.

## Files created

- `src/ai/config.ts`: server-only environment configuration and validation.
- `src/ai/assistant.ts`: Vercel AI SDK and Cloudflare AI Gateway model integration.
- `src/ai/cloudflare-binding.d.ts`: minimal type used by the Cloudflare package's optional Worker-binding API; this Node application does not use a Worker binding.
- `src/routes/assistant.ts`: authenticated Express endpoint with validation, cancellation, errors, logs, and optional streaming.
- `src/routes/assistant.test.ts`: local endpoint tests using injected fake generators.

## Files modified

- `src/index.ts`: registers `/assistant`.
- `package.json`: adds the `test:ai` script.
- `pnpm-lock.yaml`: locks new packages.
- `.env.example`: lists Phase 1 configuration values.
- `docker-compose.yml`: passes server-only AI configuration to the API container.

## Dependencies added

- `ai`: Vercel AI SDK.
- `ai-gateway-provider`: Cloudflare's current AI Gateway provider package for Vercel AI SDK.
- `@types/json-schema`: declaration package required by the current AI SDK provider type graph.

## Environment variables

- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account identifier.
- `CLOUDFLARE_AI_GATEWAY`: AI Gateway name.
- `CLOUDFLARE_AI_GATEWAY_TOKEN`: Cloudflare token with AI Gateway Run permission.
- `SERVICEFLOW_AI_MODEL`: Unified API model identifier, default `openai/gpt-4.1-mini`.
- `SERVICEFLOW_AI_TIMEOUT_MS`: request timeout in milliseconds, default 30000.
- `SERVICEFLOW_AI_MAX_OUTPUT_TOKENS`: maximum generated tokens, default 512.

The selected model must be available through the configured Cloudflare gateway, using its stored provider key or applicable Cloudflare billing configuration. These variables belong only in the API environment and are never sent to the frontend.

## Request flow

```text
Authenticated client
  → POST /assistant
  → requireAuth
  → request validation
  → Vercel AI SDK generateText or streamText
  → Cloudflare AI Gateway
  → selected LLM
  → response
```

No ServiceFlow database query, MCP server, tool call, or existing business-data route is involved in this phase.

## Streaming and cancellation

When `stream` is true, the endpoint forwards generated text chunks as a plain-text HTTP response. The Express request-abort and response-close events abort the SDK request when the client disconnects. The SDK call has a configured total timeout; timeout failures return HTTP 504 before response headers are sent.

## Error handling

- Invalid request body: HTTP 400.
- Missing or invalid access token: HTTP 401.
- Missing AI configuration: HTTP 503.
- Model/gateway failure: HTTP 502.
- Timeout: HTTP 504.
- Client cancellation: request is aborted without attempting to emit a new response.

Provider details and credentials are not returned to clients. Logs record safe metadata only: authenticated actor ID, streaming flag, duration, and failure category.

## Security decisions

- Endpoint requires ServiceFlow's existing `requireAuth` middleware.
- Cloudflare credentials are read only from server environment variables.
- No provider credential or internal configuration is returned to the frontend.
- Requests are limited to a non-empty message of at most 2000 characters.
- Generation is capped at 512 output tokens by default and has no automatic SDK retries.
- No tools, database access, filesystem access, MCP, or ServiceFlow data access are available.

## Tests

`pnpm test:ai` runs six local tests without a real model request:

1. Valid authenticated JSON request.
2. Invalid request body.
3. Unauthenticated request.
4. Gateway/model failure with sanitized error response.
5. Timeout response.
6. Plain-text streaming response.

## Verification results

- `pnpm check`: passed.
- `pnpm test:ai`: passed, 6 tests.
- `pnpm --dir frontend check`: passed with 0 errors and 0 warnings.
- `pnpm build:frontend`: passed.
- `docker compose config`: passed.
- `git diff --check`: passed.

ServiceFlow did not have a lint script or lint configuration before this phase, so there was no existing lint task to run or weaken. `pnpm peers check` reports an optional peer warning from `@openrouter/ai-sdk-provider`, an optional provider shipped by Cloudflare's gateway package; ServiceFlow does not import or use that provider.

## Phase retrospective

### What we implemented

The implementation is one authenticated endpoint plus a compact AI configuration and invocation module. It proves the ServiceFlow backend can send `Hello` through Vercel AI SDK and Cloudflare AI Gateway to an LLM once valid Cloudflare configuration is supplied.

### Why this fits ServiceFlow

It follows existing Express router, auth middleware, environment variable, logger, JSON error, Docker, and TypeScript patterns. It does not alter the existing frontend or data architecture.

### Alternatives considered

- Direct provider SDK: simpler but removes Cloudflare gateway controls and observability.
- Cloudflare REST API without Vercel AI SDK: valid but loses the SDK's provider-neutral generate/stream API.
- Vercel AI SDK with a direct provider: valid but bypasses the requested Cloudflare routing.
- Separate AI service: stronger isolation at scale but unnecessary for one read-only endpoint.

### What could have been better

The current Express application has no existing linting, centralized errors, rate limits, structured request IDs, or integration-test harness. This phase deliberately does not add a frontend test client or a real gateway integration test because that would require paid/provider credentials.

### More optimal theoretical approach

A mature deployment would use a dedicated AI gateway policy, rate limits, OpenTelemetry, request IDs, provider health checks, secrets management, audit retention, and a fully streaming UI protocol.

### Why we did not use it

That is beyond this narrow connectivity POC and would duplicate infrastructure not yet present in ServiceFlow.

### What to do differently next time

Introduce a test framework, linting, a domain-service layer, request IDs, and rate limiting before broadening the AI surface.

### Technical debt

- No production AI UI.
- No rate limiting or per-user quota.
- No provider health check.
- No external integration test with configured Cloudflare credentials.
- No audit persistence.
- No service/repository layer for future AI data tools.

### Security and reliability

The endpoint is authenticated and data-free, but provider tokens remain account-scoped Cloudflare credentials. Cloudflare recommends a token with the minimum Run permission. Future phases need stricter authorization and tenant-scoped data tools.

### Performance and cost

Cloudflare adds a network hop but provides gateway observability, routing controls, and possible caching/rate limiting. For this POC it is justified because it is a project requirement and centralizes provider access. Model latency and generated tokens dominate response cost; max output and no retries reduce unnecessary cost.

### Testing gaps

No real Cloudflare/model test has run because no credentials were supplied. Cancellation is unit-covered through the route's abort design but not tested against a live streaming provider. No load, rate-limit, or security-proxy tests exist.

### Next-phase recommendation

Proceed only after setting the environment variables and performing one controlled manual `Hello` request. If it succeeds, Phase 2 can add a minimal authenticated UI; do not add ServiceFlow data tools yet.

## Phase verdict

**Current approach:** A small authenticated Express endpoint using Vercel AI SDK and Cloudflare's official AI Gateway provider package.

**Best theoretical approach:** A dedicated, observable AI boundary with gateway policy, quotas, audit logs, and full streaming UI support.

**Main compromise:** Use local fake-generator tests instead of a live paid gateway test.

**Would I keep the current implementation?** Yes. It is the smallest typed, authenticated, data-free implementation that proves the required connection path without prematurely building an agent framework.

**Most important future improvement:** Add rate limits, audit logs, and authorization-tested tenant-scoped tools before allowing any ServiceFlow data access.

STOP.
