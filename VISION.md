# Apple Calendar MCP — Vision

Apple Calendar MCP exists so Claude (and any other MCP client) can treat the macOS Calendar.app on your Mac as a **first-class tool** — not a foreign system to be imported into, not a cloud service to authenticate against, just the calendar that's already there.

This document explains what the project is, what it is not, and where it might go.

Project overview: [`README.md`](README.md).
Contribution guide: [`CONTRIBUTING.md`](CONTRIBUTING.md).
Security model: [`SECURITY.md`](SECURITY.md).

## Why this exists

Calendar.app already knows about every calendar you use — iCloud, Google via Calendar.app, local "On My Mac", work CalDAV, whatever. It handles auth, sync, notifications, recurrence, and timezones natively. Every other "AI calendar" integration throws that away and talks to Google Calendar's API instead, leaving iCloud and on-device calendars out.

There's already a well-worn path for scripting Calendar.app: `osascript` + AppleScript. It's on every Mac, no install step, no account setup. It's verbose, it's quirky, but it _works_. So the job here is small: wrap that path in MCP, escape the inputs carefully, and ship.

## Current focus

**Priority:**

- Correctness of AppleScript escaping — every user-supplied string tested against injection payloads.
- Stable behavior on Calendar.app edge cases — `missing value` fields, events without location/notes/url, recurring-event occurrences.
- Good error messages for the most common failure (macOS denied the Automation permission).

**Next priorities:**

- Recurring-event rule editing (currently we touch individual occurrences, not the rule).
- Attendee listing and invite management.
- Reminders.app support as a sibling MCP server or a second binary.
- Timezone-aware output for cross-timezone scheduling prompts.

## Non-goals

- **Not a calendar sync service.** Calendar.app already syncs. We don't.
- **Not a CalDAV client.** If you want to talk CalDAV directly, use a CalDAV library. This project shells out to Calendar.app, which does CalDAV for us.
- **Not a Google Calendar / Outlook / iCloud API wrapper.** Those have their own MCP servers. This one is for the Mac-native path.
- **Not a GUI.** No web UI, no Electron, no tray icon. Stdio in, stdio out.
- **Not cross-platform.** Linux and Windows will not be supported. `osascript` is mac-only and that's fine — other platforms have other calendars and will need their own MCP servers.
- **Not a telemetry platform.** No analytics, no crash reports, no phone-home. The server has zero network capability by design.
- **Not a place for big features.** If it's a big feature, it probably belongs in a separate MCP server.

## Scope discipline

This is a single-file-per-tool package. Six tools today. The bar for adding a seventh is high — it needs to be something that:

1. Cannot be done by combining the existing tools with a better prompt.
2. Cannot be done by a downstream MCP server that composes this one.
3. Fits the single-binary, local-only, stdio-only posture.

Attendee listing and recurrence-rule editing both pass that bar. A calendar-sharing CLI, a multi-user access model, or a "sync to Google" endpoint do not.

## Why TypeScript (and not Swift)

EventKit is nicer than AppleScript. A signed Swift helper binary would be faster and handle recurrence natively. The reason we don't do that:

- Packaging a signed native binary through npm is a distribution nightmare (notarization, architecture matrix, update flow).
- AppleScript + `osascript` is already installed on every Mac.
- A TypeScript MCP server is hackable by anyone who already knows TS — a lower contribution bar than "write me some Swift."

If shipping a native binary ever becomes trivial, and if AppleScript limits become painful enough to justify it, we'll revisit. For now: TypeScript.

## What we will not merge (for now)

- Integrations with non-Apple calendars (Google API, Microsoft Graph, etc.).
- Network listeners, HTTP endpoints, or anything that moves off stdio.
- Telemetry of any kind.
- A configuration file. This server takes zero config — if you want a prefix, a default calendar, or a filter, your MCP client can pass it in tool args.
- Plugin systems. There is no plugin layer.
- Bundled TUI / GUI.

This list is a roadmap guardrail, not a law of physics. Strong user demand and a clean design can change it.

## Stability posture

- **Versioning:** semver. Pre-1.0 minor bumps may break the tool-argument schema. Patch releases will not.
- **Tool schemas** (the `Input`/`Output` zod types) are the public API. Changes get a changelog entry.
- **Internal AppleScript source** is not a public API. It can change shape across patch releases.
