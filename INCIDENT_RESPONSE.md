# Apple Calendar MCP Incident Response Plan

Scope: what to do when an attacker (or a compromised LLM) misuses this MCP server, or when a vulnerability in the server itself is reported.

## 1. Detection and triage

Likely signals:

- An unexpected `delete_event` or `update_event` call visible in the MCP client transcript.
- Calendar.app showing events the user did not create.
- A macOS Automation / Calendar permission prompt for a process the user did not intentionally authorize.
- A private vulnerability report via GitHub Security Advisories.
- Automated signals (Dependabot, CodeQL, npm advisories) against dependencies.

Initial triage:

1. Confirm the affected component, version, and trust boundary impact.
2. Classify the issue using the scope rules in [`SECURITY.md`](SECURITY.md).
3. For active in-the-wild misuse, prioritize **revoking the attacker's capability** before doing forensic analysis. See section 3 below.

## 2. Severity assessment

- **Critical** — AppleScript injection that escapes Calendar.app into arbitrary `osascript` execution (e.g. `do shell script`). A package-level compromise (stolen npm token, malicious publish).
- **High** — verified trust-boundary bypass requiring limited preconditions (e.g. a tool argument reaching `osascript` without `escapeAppleScriptString`, even if the known payload is constrained).
- **Medium** — stdout corrupting the MCP transport when specific inputs are provided; a permission-scope creep; an error message leaking local filesystem paths.
- **Low** — defense-in-depth findings; timing differences; parity-only issues.

## 3. Response — compromised Claude / MCP client

If you believe a running Claude (or other MCP client) instance is misusing `apple-calendar-mcp`:

1. **Stop the MCP client process.** For Claude Code: quit it. For a shell-launched `npx apple-calendar-mcp`: kill the parent process. The server has no background daemon — when the parent dies, the server dies.
2. **Revoke Calendar Automation permission.**
   - Open **System Settings → Privacy & Security → Automation**.
   - Find the terminal / IDE that spawned the MCP server.
   - Disable its **Calendar** toggle.
   - The next invocation will fail until you re-enable it, which gives you a controlled re-grant point.
3. **Audit recent Calendar.app activity.** Open Calendar.app and review the time window the compromised client was live. The MCP server's `list_events` tool (run it yourself from a clean shell) can scope the audit:

   ```bash
   apple-calendar-mcp   # then from your MCP client:
   # call list_events with start_date = <suspect window start>, end_date = now
   ```

4. **Check for data exfiltration via event notes.** The server exposes `notes`, `url`, and `location` read/write. If any of those fields were used to stage exfiltration (an attacker dropping data into a notes field to read it later), search those fields:
   - Call `search_events` with broad queries (`http`, `://`, `token`, `key`, anything domain-specific).
5. **Rotate anything referenced in event notes or locations.** If secrets or links were in notes / locations of events the compromised client touched, assume they were read.
6. **Check Calendar.app for foreign calendar subscriptions** — `list_calendars` will show any calendar the server can see, including ones that were subscribed without your knowledge.

## 4. Response — vulnerability in the server itself

1. Acknowledge receipt to the reporter (private).
2. Reproduce on `latest` on npm and latest `main`; verify scope and severity.
3. Implement the fix on a private branch if the fix itself would telegraph the exploit; otherwise on a public branch is fine.
4. Add a regression test. For anything touching `escapeAppleScriptString` or a `build*Script` function, the regression test **must** include the specific injection payload from the report.
5. Ship a patch release. For Critical/High, ship as fast as practical (target: same-day for Critical, ≤ 2 weeks for High).
6. Publish a GitHub Security Advisory with reporter credit.
7. Request a CVE for Critical/High findings.

## 5. Communication

- **GitHub Security Advisory** for Critical/High.
- **Changelog entry** for every security fix, even Low.
- **README note** if the fix changes user-visible behavior (e.g. a tool arg is now rejected where it was previously accepted).
- Direct reporter follow-up through the advisory thread.

## 6. Recovery and follow-up

After the fix ships:

1. Verify the fix in CI and in the published npm artifact.
2. Run a short post-incident review (timeline, root cause, detection gap, prevention plan).
3. Add hardening tasks: new test payloads, any missing escape paths, updated AGENTS.md guidance for whatever went wrong.

## 7. Things this plan does _not_ cover

- Calendar.app itself being compromised. That's an Apple problem, not an `apple-calendar-mcp` problem.
- The user's MCP client config being tampered with. If `~/.claude.json` has been edited to point at a malicious MCP server, that's an OS-level compromise — outside this project's scope.
- Attacks against the npm registry or the maintainer's account. Those follow the GitHub/npm incident processes, not this one.
