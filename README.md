# apple-calendar-mcp

[![npm version](https://img.shields.io/npm/v/apple-calendar-mcp.svg)](https://www.npmjs.com/package/apple-calendar-mcp)
[![license](https://img.shields.io/npm/l/apple-calendar-mcp.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/apple-calendar-mcp.svg)](https://nodejs.org)

A Model Context Protocol (MCP) server that lets Claude Code — and any other MCP client — read and write events in the native macOS Calendar.app. It speaks AppleScript under the hood (no cloud API, no extra account setup) and exposes six focused tools for listing, searching, creating, updating, and deleting events. Everything runs locally over stdio; your calendar never leaves your Mac.

## Features

- `list_calendars` — list every calendar in Calendar.app with a writable flag
- `list_events` — fetch events in any date range, optionally filtered by calendar
- `search_events` — substring search across title, location, and notes
- `create_event` — create an event on any writable calendar
- `update_event` — change any field of an existing event by id
- `delete_event` — remove an event by id

## Installation

### Option 1: via `npx` (recommended)

Add this to your Claude Code MCP config (`~/.claude.json` or project-local `.mcp.json`):

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

Or, from a terminal:

```bash
claude mcp add apple-calendar -- npx -y apple-calendar-mcp
```

### Option 2: from source

```bash
git clone https://github.com/yongzhe-wang/apple-calendar-mcp.git
cd apple-calendar-mcp
npm install
npm run build
```

Then point your MCP client at the built binary:

```json
{
  "mcpServers": {
    "apple-calendar": {
      "command": "node",
      "args": ["/absolute/path/to/apple-calendar-mcp/dist/index.js"]
    }
  }
}
```

## macOS Permissions

The first time a tool runs, macOS will ask you to grant Calendar access. This is expected.

If you later see **“not authorized”** or **error -1743 / -1744**, grant access manually:

1. Open **System Settings → Privacy & Security → Automation**
2. Find your terminal / IDE (Terminal.app, iTerm, VS Code, Cursor, Claude Code…)
3. Enable the **Calendar** toggle underneath it

You may also need **Privacy & Security → Calendars** enabled for the same process. If you installed via `npx`, the controlling process is whichever app spawned `npx`.

## Tool reference

| Tool | Description | Key args |
|---|---|---|
| `list_calendars` | All calendars with `name` + `writable` | — |
| `list_events` | Events in a date range | `start_date`, `end_date`, `calendar_name?`, `limit?` |
| `search_events` | Substring search over title/location/notes | `query`, `start_date?`, `end_date?`, `limit?` |
| `create_event` | Create a new event | `title`, `start_date`, `end_date`, `calendar_name?`, `location?`, `notes?`, `url?`, `all_day?` |
| `update_event` | Update any subset of fields | `event_id`, plus any optional field from `create_event` |
| `delete_event` | Delete by id | `event_id` |

All dates are ISO 8601 (e.g. `2026-04-21T14:30:00Z` or `2026-04-21T10:30:00-07:00`). Event `id` values are Calendar.app `uid` strings, which are stable across calls.

## Usage examples

Prompts you can give Claude Code once this server is configured:

- “What's on my calendar this week? Summarize anything overlapping.”
- “Create a 30-minute focus block tomorrow at 9am titled ‘Deep work — refactor.’”
- “Find all events mentioning ‘1:1’ in the last month and list the attendees.”
- “Move my Friday 3pm dentist appointment to next Tuesday at 10am.”

## Development

```bash
git clone https://github.com/yongzhe-wang/apple-calendar-mcp.git
cd apple-calendar-mcp
npm install
npm run typecheck
npm test
npm run build
```

- `npm run dev` — rebuild on change
- `npm run lint` — Biome lint + format check
- `npm run lint:fix` — auto-fix and format

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

## Security note

Every user-supplied string that reaches AppleScript — event titles, notes, calendar names, event ids, etc. — is passed through `escapeAppleScriptString`, which escapes backslashes and double quotes before wrapping the value in quotes. This is the only user input path into `osascript`, and the function is unit-tested against injection payloads. AppleScript strings are otherwise 8-bit clean, so Unicode and newlines are preserved.

The server runs strictly over stdio; there is no network listener, no HTTP endpoint, and no external telemetry.

## Contributing

Bug reports and pull requests welcome at
[github.com/yongzhe-wang/apple-calendar-mcp/issues](https://github.com/yongzhe-wang/apple-calendar-mcp/issues).

## License

MIT © Yongzhe Wang
