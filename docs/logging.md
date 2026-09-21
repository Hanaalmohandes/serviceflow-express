# Logging

The API emits structured JSON logs. Each log has a timestamp, severity, message, and safe context fields.

- `debug`: development diagnostics such as cache hits and misses.
- `info`: successful API requests, application lifecycle events, cache invalidation, and successful business actions.
- `warn`: rejected authentication, authorization, validation, and client-error requests.
- `error`: server failures and startup failures.

The request logger runs before every API route, so every response is logged with its HTTP method, path, status code, and duration. Passwords, access tokens, refresh tokens, request bodies, and email addresses are never included in log context.
