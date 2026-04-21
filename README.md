# 🍎 Apple Calendar MCP — macOS Calendar for Claude

<p align="center">
  <strong>LIST! CREATE! UPDATE! DELETE!</strong>
</p>

<p align="center">
  <a href="https://github.com/yongzhe-wang/apple-calendar-mcp/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/yongzhe-wang/apple-calendar-mcp/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/apple-calendar-mcp"><img src="https://img.shields.io/npm/v/apple-calendar-mcp?style=for-the-badge" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D22.14-brightgreen?style=for-the-badge" alt="Node >=22.14"></a>
</p>

**Apple Calendar MCP** is a _Model Context Protocol_ server that hands Claude (and any other MCP client) the keys to the macOS Calendar.app that's already on your Mac. It speaks AppleScript under the hood — no cloud API, no CalDAV account setup, no telemetry — and exposes six focused tools for listing, searching, creating, updating, and deleting events.

If you want Claude to actually _do_ things on your calendar instead of pasting iCal blobs at you, this is it.

[GitHub](https://github.com/yongzhe-wang/apple-calendar-mcp) · [Issues](https://github.com/yongzhe-wang/apple-calendar-mcp/issues) · [Changelog](CHANGELOG.md) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Vision](VISION.md)

## Install

Runtime: **Node 22.14+**, macOS (Calendar.app required).

```bash
claude mcp add apple-calendar -- npx -y apple-calendar-mcp
```

Or use the `npx` one-liner directly — no install step — and let your MCP client spawn it on demand (see [Quick start](#quick-start) below).

## Quick start

Add this to your Claude Code MCP config (`~/.claude.json` or a project-local `.mcp.json`):

```json
{
  "mcpServers": {
    "apple-calendar": {
      "command": "npx",
      "args": ["-y", "apple-calendar-mcp"]
    }
  }
}
```

Then ask Claude things like:

- _"What's on my calendar this week? Summarize anything that overlaps."_
- _"Create a 30-minute focus block tomorrow at 9am titled 'Deep work — refactor.'"_
- _"Find every event mentioning '1:1' in the last month and list the attendees."_
- _"Move my Friday 3pm dentist appointment to next Tuesday at 10am."_

**Default:** the server runs over stdio only. Your calendar never leaves your Mac.

## macOS permissions

The first time a tool runs, macOS will prompt you to grant Calendar access to the controlling process (the terminal or IDE that spawned `npx`). Approve it.

If you see **"not authorized"** or error **-1743 / -1744** later:

1. Open **System Settings → Privacy & Security → Automation**.
2. Find your terminal / IDE (Terminal.app, iTerm, VS Code, Cursor, Claude Code…).
3. Enable the **Calendar** toggle underneath it.

You may also need **Privacy & Security → Calendars** enabled for the same app. If you launched via `npx`, the controlling process is whichever app spawned it — not `npx` itself.

## Tools

| Tool             | Description                                   | Key args                                                                                       |
| ---------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `list_calendars` | All calendars with `name` + `writable`        | —                                                                                              |
| `list_events`    | Events in a date range                        | `start_date`, `end_date`, `calendar_name?`, `limit?`                                           |
| `search_events`  | Substring match across title, location, notes | `query`, `start_date?`, `end_date?`, `limit?`                                                  |
| `create_event`   | Create a new event on any writable calendar   | `title`, `start_date`, `end_date`, `calendar_name?`, `location?`, `notes?`, `url?`, `all_day?` |
| `update_event`   | Update any subset of fields                   | `event_id`, plus any optional field from `create_event`                                        |
| `delete_event`   | Delete by id                                  | `event_id`                                                                                     |

All dates are ISO 8601 (`2026-04-21T14:30:00Z` or `2026-04-21T10:30:00-07:00`). Event `id` values are Calendar.app `uid` strings — stable across calls, safe to stash and reuse.

## Security defaults

Apple Calendar MCP treats _every_ string arriving from an MCP tool call as untrusted. That matters because AppleScript has no prepared-statement equivalent.

- **AppleScript string escaping.** Every user-supplied string (event titles, notes, calendar names, event ids, etc.) passes through `escapeAppleScriptString`, which escapes `\` and `"` before wrapping in quotes. This is the only user-input path into `osascript`, and the function is unit-tested against injection payloads like `"; do shell script "rm -rf /"; --`.
- **stdio is the transport.** Everything human-readable goes to _stderr_. Stdout is reserved for the MCP protocol. Don't `console.log` in tool code — that corrupts the transport.
- **Stable event ids.** `id` is the Calendar.app `uid`, not a list-index or hash. It survives restarts, moves between calendars, and edits.
- **What this server does NOT do:** no network listener, no HTTP endpoint, no CalDAV/iCloud/Google sync, no telemetry, no background processes. Your MCP client spawns `osascript`, gets a reply, and that's the end of it.

See [`SECURITY.md`](SECURITY.md) for the full threat model.

## Highlights

- **Zero-config from Claude Code** — one `claude mcp add` line and you're done.
- **Local-only** — no cloud, no CalDAV client, no background daemon.
- **Six tools, nothing hidden** — list calendars, list events, search, create, update, delete.
- **AppleScript-injection hardened** — every string is escaped, every escape is unit tested.
- **Stable event ids** across calls and sessions.
- **ISO 8601 everywhere** — timezone-aware inputs, deterministic outputs.
- **Unicode-clean** — emoji, CJK, and newlines round-trip through `osascript` without mangling.

## Development

```bash
git clone https://github.com/yongzhe-wang/apple-calendar-mcp.git
cd apple-calendar-mcp
pnpm install
pnpm test
pnpm build
pnpm check
```

- `pnpm dev` — rebuild on change
- `pnpm test` — run the unit suite (pure helpers only, no Calendar.app required)
- `pnpm lint` / `pnpm lint:fix` — oxlint
- `pnpm format` / `pnpm format:check` — oxfmt
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm knip` — unused code/deps
- `pnpm check` — typecheck + lint + format:check + knip (same gate as CI)

Project layout:

```
src/
  index.ts           # MCP server bootstrap (stdio transport)
  applescript.ts     # osascript bridge + string/date escaping helpers
  errors.ts          # user-facing error formatting
  types.ts           # zod schemas for tool inputs
  tools/             # one file per MCP tool
test/                # unit tests for pure helpers (no Calendar.app required)
```

## How it works

Apple Calendar MCP runs `osascript -e <script>` for each tool call. It builds the AppleScript source in TypeScript, escapes every untrusted field through `escapeAppleScriptString`, and reads back a single string result.

To survive arbitrary user text inside that result (commas, newlines, quotes, emoji), the scripts emit fields joined by ASCII control bytes — **record separator** `0x1E` between rows and **unit separator** `0x1F` between fields. These bytes virtually never appear in real calendar data, so parsing becomes a dumb `split` — no CSV/JSON quoting gymnastics, no ambiguity.

Why not a Swift/EventKit helper binary? EventKit is cleaner, but shipping a signed native binary through npm is a packaging nightmare, and AppleScript + `osascript` is already on every Mac. The trade-off is verbose scripts; the win is zero-dependency distribution.

## FAQ

**Does this need iCloud?** No. It talks to whatever calendars are configured in Calendar.app — iCloud, Google (via Calendar.app), local "On My Mac", CalDAV, whatever. If Calendar.app can see it, this server can.

**Does it need Full Disk Access?** No. Only Automation access to Calendar (and, on some macOS versions, Privacy & Security → Calendars).

**Linux / Windows support?** No. This server is Mac-only by design — it uses `osascript` and Calendar.app. The `package.json` declares `"os": ["darwin"]` so `npm install` on other platforms is a fast fail.

**How are event ids stable?** The `id` is the Calendar.app `uid`, a UUID-ish string that persists across edits, calendar moves, and Calendar.app restarts. It's the same value Calendar.app uses in CalDAV sync.

**Recurring events?** The current tools read each occurrence as Calendar.app presents it. You can update or delete a specific occurrence by its `uid`, but this server does not (yet) expose recurrence-rule editing. See [`VISION.md`](VISION.md) for the roadmap.

**Does anything get sent over the network?** No. Zero network listeners, zero outbound calls. The server reads stdin, writes stdout, and shells out to `osascript` — that's it.

## Contributing

Bug reports and PRs welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup, review, and scope guidelines.

## License

MIT © Yongzhe Wang 2026
