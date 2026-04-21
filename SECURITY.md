# Security Policy

If you believe you've found a security issue in Apple Calendar MCP, please report it privately.

## Supported versions

Apple Calendar MCP follows a rolling-release model. Only the **latest published version on npm** is supported for security fixes. Pin to `latest` in MCP client configs rather than an older version.

| Version   | Supported    |
| --------- | ------------ |
| `0.1.x`   | ✅ (current) |
| `< 0.1.0` | ❌           |

## Reporting a vulnerability

**Do not open a public GitHub issue.**

Report privately through GitHub Security Advisories:

- Go to <https://github.com/yongzhe-wang/apple-calendar-mcp/security/advisories/new>
- File a report with the details below.

If GitHub Security Advisories is unavailable, email the maintainer via the email listed on <https://github.com/yongzhe-wang>.

### Required in reports

1. **Title** — short, specific (e.g. "AppleScript injection in `update_event.calendar_name`").
2. **Severity assessment** — Critical / High / Medium / Low, with one-line justification.
3. **Impact** — concrete capability the attacker gains.
4. **Affected component** — file + function + line range.
5. **Technical reproduction** — minimal repro steps or PoC.
6. **Demonstrated impact** — output / screenshot / log proving the capability.
7. **Environment** — macOS version, Node version, `apple-calendar-mcp` version, MCP client.
8. **Remediation advice** — what should change and where.

Reports without reproduction steps, demonstrated impact, and remediation advice will be deprioritized.

### Acceptance gate

For fastest triage, include all of:

- Exact vulnerable path (`file`, function, line range) on a current revision.
- Tested version details (`apple-calendar-mcp` version and commit SHA).
- Reproducible PoC against `latest` on npm or `main` on GitHub.
- Demonstrated impact tied to this project's documented trust boundaries (see below).
- Scope check explaining why the report is _not_ covered by "Out of scope."

Parity-only findings (e.g. "this field isn't escaped _as strictly_ as that one" without a demonstrated injection primitive) are treated as hardening, not vulnerabilities.

## Threat model

Apple Calendar MCP is a local MCP server. Its threat model assumes:

- The host Mac is trusted. Anyone with local user access to the Mac is already a trusted operator.
- The MCP client (Claude Code, etc.) is trusted as a process, but **LLM-authored tool arguments are untrusted input** and must be treated as adversarial.
- `osascript` is trusted. Calendar.app is trusted.

Trust boundaries this project _does_ protect:

- **LLM tool arguments → AppleScript source.** Every user-supplied string that reaches `osascript` must pass through `escapeAppleScriptString`. That is the only sanctioned path for untrusted text into AppleScript. Breaking that invariant is a vulnerability.
- **MCP transport integrity.** Stdout is reserved for the MCP protocol. Any code that writes human-readable output to stdout instead of stderr corrupts the transport and is a vulnerability-adjacent bug.
- **Permission scope.** The server must never request or use permissions beyond `Calendar` Automation (and, on some macOS versions, Privacy & Security → Calendars). Anything that triggers Full Disk Access, Accessibility, or Screen Recording is a scope violation.

## What this server does and doesn't touch

**Does:**

- Spawn `osascript` with an AppleScript string built by this server's code.
- Read and write events, calendars, locations, notes, URLs, and all-day flags in Calendar.app.

**Does not:**

- Open any network socket (no HTTP, no WebSocket, no UDP).
- Make any outbound network call.
- Read or write files outside what Calendar.app does on its own (this server never touches the filesystem directly).
- Read environment variables or process state beyond what Node needs to boot.
- Spawn any process other than `osascript`.
- Send telemetry, analytics, or crash reports.
- Persist anything to disk.

If a future change needs to cross any of the "does not" lines above, it must be called out in the README and reviewed as a security-relevant change.

## AppleScript injection mitigation

`escapeAppleScriptString` (see `src/applescript.ts`) is the single chokepoint for untrusted strings:

1. It escapes backslash first (`\\` → `\\\\`).
2. Then escapes double-quote (`"` → `\\"`).
3. Then wraps the result in double quotes.

This ordering matters. Test coverage in `test/applescript.test.ts` includes injection payloads like `"; do shell script "rm -rf /"; --`. Any change to this function, or any new tool that fails to use it, must include equivalent test coverage.

Dates are _not_ passed as strings. `isoToAppleScriptDate` converts an ISO timestamp to an AppleScript expression that reconstructs a date from epoch seconds — no locale-sensitive `date "..."` literal, no string interpolation of user text into a date expression.

The output format (record separator `0x1E`, unit separator `0x1F`) is not a security boundary — it's a parsing simplification. Never rely on it for sanitization.

## Responsible disclosure timelines

- **Acknowledgement:** within 3 business days of receipt.
- **Initial assessment:** within 7 days, including severity and whether the report is in scope.
- **Fix target:**
  - Critical — patched release as fast as practical (days).
  - High — next patch release (≤ 2 weeks).
  - Medium — next minor release.
  - Low — tracked as a hardening task, no scheduled fix date.
- **Public disclosure:** coordinated with the reporter. We prefer a GitHub Security Advisory + CVE for Critical/High; lower-severity findings are documented in the changelog.

## Out of scope

- Prompt injection attacks that do not cross a documented trust boundary (LLM being tricked into calling `delete_event` on real events the user's own tools granted it access to is not a vulnerability in this server).
- Denial-of-service via Calendar.app being slow or hanging.
- `osascript` timing or stderr-leakage findings without a concrete impact.
- Reports that require modifying the user's local `~/.claude.json` or MCP client config.
- Reports that require a malicious MCP client. The MCP client is trusted; this server trusts its transport.
- Findings against test-only code (`test/**`) or development configs (`knip.config.ts`, `tsdown.config.ts`, etc.) that are not shipped in the published npm package.
- Outdated-dependency CVEs without a PoC demonstrating the vulnerable code path is reachable through this server.

## Bug bounties

There is no paid bug-bounty program. The best thanks is a fix PR once the advisory is public.
