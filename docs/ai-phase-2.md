# AI Assistant Phase 2

## Components created

- `frontend/src/routes/assistant/+page.svelte`: authenticated chat screen and conversation state owner.
- `frontend/src/lib/components/assistant/chat-message.svelte`: safe plain-text user and assistant message bubble.
- `frontend/src/lib/components/assistant/chat-composer.svelte`: accessible message input, counter, send action, and keyboard handling.
- `frontend/src/lib/assistant/chat.ts`: chat types and pure validation, submission, message-update, retry-cleanup, and keyboard helpers.
- `frontend/src/lib/assistant/chat.test.ts`: frontend state tests.
- `frontend/src/routes/assistant/+server.ts`: same-origin server proxy to the Phase 1 API.

## Files changed

- `frontend/src/routes/+layout.svelte`: adds the AI Assistant navigation item in every supported navigation language.
- `package.json`: adds `test:frontend`.

## Frontend and backend communication

The browser sends `POST /assistant` to its own SvelteKit origin. The SvelteKit proxy reads the secure HTTP-only access-token cookie on the server and forwards the request to the existing authenticated Express `POST /assistant` endpoint with the token in the authorization header. The proxy passes the response body through without buffering it, so text begins reaching the browser as the backend emits chunks.

The browser never receives the access token, Cloudflare account ID, gateway name, gateway token, model configuration, or raw backend/provider errors.

## State management

The chat page holds current conversation messages, draft text, generating status, validation error, request error, and the last failed message in local Svelte state. No global store is used because a conversation is currently limited to one page and is not persisted. The current conversation exists only until the user refreshes or leaves the page.

## Streaming implementation

The page requests `{ message, stream: true }`, reads the response body with `ReadableStream.getReader()`, decodes chunks with `TextDecoder`, and replaces only the assistant placeholder content as text arrives. The page has one reactive effect for auto-scrolling after message or loading-state changes. The proxy sends the stream directly from the API response and marks it `no-store`.

## Error handling

- Empty and over-2,000-character messages are rejected before a request is sent.
- Sending is disabled while generation is active and the page additionally guards against concurrent calls.
- A failed response removes the empty assistant placeholder, retains the user message, and offers Retry without adding that user message again.
- The proxy maps server failures to safe public messages and does not expose backend details.
- Request cancellation does not show a misleading failure notice.

## Accessibility decisions

- Input has a visible label, help text, character count, and alert-linked validation message.
- Conversation has an accessible label and `aria-busy` during generation.
- Assistant updates use a polite live region.
- Error notices use `role="alert"`.
- Keyboard behavior is explicit: Enter sends, Shift+Enter inserts a line, and IME composition is respected.
- Message content uses normal escaped Svelte interpolation rather than HTML injection.

## Tests performed

- `pnpm test:frontend`: tests empty/long validation, duplicate-submission prevention, streaming placeholder updates, failure cleanup for retry, and keyboard behavior.
- `pnpm --dir frontend check`: Svelte and TypeScript check.
- `pnpm build:frontend`: production frontend build.
- `pnpm check`: backend TypeScript check.
- `git diff --check`: whitespace check.

There is no existing frontend component-test runner in ServiceFlow. The state tests exercise the page's core behavior, while a real end-to-end streamed response needs valid local Cloudflare configuration and an authenticated browser session.

## Phase retrospective

### What we implemented

A route-local ServiceFlow AI Assistant screen with a message list, composer, streaming assistant placeholder, safe error and retry UI, and an authenticated same-origin proxy to Phase 1. The existing Phase 1 backend invocation was not rewritten, and MCP or ServiceFlow data access was not added.

### Why we implemented it this way

ServiceFlow already uses SvelteKit, secure server-side cookies, and local page patterns. A SvelteKit proxy preserves that token boundary while allowing the browser to consume the streaming body. Small components match the current component-oriented frontend and keep the route responsible only for conversation orchestration.

### Alternatives considered

- A single page component: fewer files, but message presentation and composer behavior would make the route harder to maintain.
- A global Svelte store: useful for cross-page or persisted conversations, but unnecessary for a transient single route.
- A non-streaming JSON call: simpler, but it would remove the requested responsive generation experience already available from Phase 1.
- Persisted conversation storage: helpful for history and audit, but it would require database design, retention policy, authorization work, and a clear product decision.
- An AI SDK browser client: it would not suit the existing HTTP-only-cookie architecture and could complicate the backend boundary.

### What could have been done better

The route still owns several pieces of asynchronous lifecycle logic because the app has no existing reusable chat abstraction. The error UI is deliberately generic but cannot distinguish all recoverable provider conditions. The mobile layout is responsive, but it has not been manually exercised across physical devices. The current one-effect auto-scroll always follows new output; a more advanced version would avoid moving a user who has intentionally scrolled upward.

### What would be more optimal

At greater scale, use a dedicated conversation domain with server-persisted conversation and message records, a typed streaming protocol, request IDs, telemetry, resumable streams, per-user quotas, a reusable chat store, virtualized history, and browser integration tests against a controlled streaming test server.

### Why we did not use it

That architecture would add schemas, migrations, authorization rules, global state, observability, and product decisions beyond the Phase 2 requirement for a basic data-free UI. It would be overengineering before the assistant proves useful to users.

### What I would do differently if starting again

I would establish frontend component testing and linting before the first UI feature, define an application-wide error-message policy, and make the navigation layout responsive before adding more feature routes. I would also agree on whether conversations need retention before writing any storage code.

### Technical debt

- Conversation history is not persisted.
- There is no conversation list, search, export, deletion, or retention policy.
- Output is plain text only; rich Markdown, citations, code blocks, and copy controls are deferred.
- Auto-scroll does not yet account for users reading older messages.
- No user-controlled cancellation control is exposed, although navigation/disconnection ends the request.
- Localization exists for the navigation item; the initial chat screen copy is English-only.

### Security and reliability

Svelte escapes rendered message text, so LLM output is not rendered as unsafe HTML. The backend and proxy retain the existing authenticated boundary. The browser never receives provider configuration or access-token values. Client and button guards prevent accidental repeated submissions, while the backend remains the authoritative message validator. Generic proxy messages keep internal backend and provider failures out of the UI. This phase does not send organization, user, request, department, or other ServiceFlow data to the model.

### Performance and cost

Only the current prompt is sent to the backend; prior messages are displayed locally but not resent, which prevents conversation history from increasing token usage. Streaming updates one assistant message rather than rebuilding unrelated data. Very long local history is not virtualized because it disappears on route exit, but persistence will require message-windowing and summarization before sending history to a model. Duplicate prevention and the Phase 1 output-token limit reduce repeated and excessive model cost.

### Testing gaps

There are no browser-level component tests, live streaming integration tests, mobile-device tests, accessibility-audit runs, slow-network tests, or tests for unexpected stream truncation. A real gateway test is intentionally not run without supplied Cloudflare credentials. The existing project has no lint configuration, so no lint task exists to run.

### Next-phase recommendation

The UI and backend boundary are stable enough for a small, explicitly scoped MCP discovery/design phase, but MCP should not be connected until tenant and department authorization rules, tool contracts, audit logging, rate limits, and live integration testing are designed. Do not grant broad ServiceFlow database access to an assistant.

## Phase verdict

**Current approach:** A route-local Svelte chat UI using a secure SvelteKit streaming proxy to the existing Phase 1 endpoint.

**Best theoretical approach:** A persisted, observable, quota-controlled conversation service with typed resumable streams and a tested reusable frontend chat domain.

**Main compromise:** Transient local conversation state and focused state tests instead of persistent history and full browser integration tests.

**Would I keep the current implementation?** Yes. It is appropriately small, preserves authentication and streaming, follows the existing frontend, and avoids premature data access or global architecture.

**Most important future improvement:** Establish tenant-authorized, audited tool boundaries before the model can access any ServiceFlow data.

STOP.
