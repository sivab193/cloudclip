# API contract

Base: `https://cc-api.siv19.dev/api`. Authenticated routes require `Authorization: Bearer <Firebase ID token>`. Error bodies use `{error: string}`; validation errors can include details. Responses are `Cache-Control: no-store`.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | /users/sync | Upsert profile; optional name; email from token |
| GET | /users/me | Current profile |
| GET | /users/me/keys | Wrapped keys; 404 when no keys exist |
| PUT | /users/me/keys | Compare-and-set using next keyVersion; 409 on conflict |
| DELETE | /users/me/keys | Recent login required; delete encrypted data and key envelopes |
| DELETE | /users/me | Recent login required; delete account and its data |
| GET | /devices | User's registered installation labels |
| POST | /devices | Upsert deviceId, deviceName, os scoped to owner |
| DELETE | /devices/:deviceId | Remove a label, not a Firebase session |
| GET | /clipboards?limit=50 | Newest entries; limit clamped to 1–100 |
| POST | /clipboards | deviceId, deviceName, encrypted content, optional UUID requestId |
| DELETE | /clipboards/:id | Owner-scoped deletion |
| DELETE | /clipboards | Delete all user's clipboard entries |
| GET | /shared | User's nonexpired links |
| POST | /shared | Encrypted content, eight-character base58 code, optional owner-wrapped token, ttlDays 1–30 (default 7) |
| GET | /shared/:code | Public ciphertext and dates only; no owner metadata |
| DELETE | /shared/:id | Owner-scoped link deletion |
| DELETE | /shared | Remove all user's links |

JSON requests are capped at 256 KB; content at 200,000 characters. Invalid MongoDB IDs return 400, missing owner-scoped records return 404. HTTP throttling is 300 requests/15 minutes/IP; public lookup additionally allows 20/15 minutes/IP. Limits are process-local.

Clipboard/share creation accepts `keyId`: the UUID of the unlocked account key, or explicit null for a legacy key without an ID. A mismatched or removed key returns 412; unlock again instead of retrying old ciphertext. Omission is accepted only for backward compatibility with installed clients. UUID `requestId` provides clipboard-create retry deduplication per owner.

Socket handshake: `auth: {token}`. Notifications: `clipboard:new` (document), `clipboard:deleted` (`{id}`), `clipboard:cleared`, `encryption:reset`. `auth:refresh` precedes server disconnect so the client can reconnect with a fresh token.

Compatibility socket writes: `clipboard:create`, `clipboard:delete`, `clipboard:clearAll`. Acknowledgements use `{ok, error?, clipboard?, id?}`. New clients use REST writes.

`GET /health` is outside the API prefix and reports MongoDB connection readiness. It does not verify DNS, the web app, account creation or signing.
