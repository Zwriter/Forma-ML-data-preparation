# Engine IPC

The desktop communicates with the local Python sidecar over NDJSON on stdin/stdout. It does not
use HTTP, so there is no browser origin or CORS surface. Each request carries an `id`, method,
and object `params`; the final response echoes that ID. Unsolicited job progress is emitted as a
separate event envelope. Protocol stdout must never contain logs or other output.

The contract and stable errors are documented in
[`specs/001-forma-mvp/contracts/ipc.md`](../specs/001-forma-mvp/contracts/ipc.md). If a future
local integration adds HTTP, bind only to loopback, validate the Origin header against the
desktop origin, and explicitly configure the allowed methods and headers. Do not allow wildcard
CORS origins for local dataset operations.
