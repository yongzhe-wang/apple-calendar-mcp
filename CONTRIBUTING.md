# Contributing to Apple Calendar MCP

Thanks for helping out. This is a small, single-package MCP server with a narrow surface area, so the contribution bar is "small, focused, tested."

## Quick reference

- **Repo:** <https://github.com/yongzhe-wang/apple-calendar-mcp>
- **Issues:** <https://github.com/yongzhe-wang/apple-calendar-mcp/issues>
- **Vision:** [`VISION.md`](VISION.md)
- **Security:** [`SECURITY.md`](SECURITY.md)
- **Agent/AI onboarding:** [`AGENTS.md`](AGENTS.md)

## Maintainer

- **Yongzhe Wang** — [@yongzhe-wang](https://github.com/yongzhe-wang)

## How to contribute

1. **Bugs and small fixes** — open a PR. Include a test when the bug is in a pure helper (anything in `src/applescript.ts`, `src/errors.ts`, `src/types.ts`, or `src/tools/*`'s `build*Script` / `parse*Output` functions).
2. **New tools / new behavior** — open an issue first, especially for anything that touches the AppleScript generation or permission surface. Most scope expansion belongs in a downstream MCP server, not this one.
3. **Refactor-only PRs** — please don't, unless a maintainer has explicitly asked. Refactors without a concrete fix behind them are hard to review and easy to regress.
4. **Questions** — open a GitHub Discussion or issue. There is no Discord.

## Development setup

```bash
git clone https://github.com/yongzhe-wang/apple-calendar-mcp.git
cd apple-calendar-mcp
pnpm install
pnpm test
pnpm build
```

Runtime: **Node 22.14+**, macOS (the server is mac-only; tests run on any OS because they hit pure helpers).

Package manager: **pnpm 10.33+**. We do not accept `package-lock.json` or `yarn.lock` in PRs.

## Before you PR

Run the same gate CI runs:

```bash
pnpm check    # typecheck + lint + format:check + knip
pnpm test     # vitest unit suite
pnpm build    # dist/index.js
```

For a one-liner install sanity-check, pack and install the tarball:

```bash
pnpm pack
npm install -g ./apple-calendar-mcp-*.tgz
apple-calendar-mcp --help   # should print MCP handshake on stderr and exit
```

## Branch and commit style

- Branch from `main`. Name it `<type>/<short-topic>`, e.g. `fix/escape-recurring-uid` or `feat/list-attendees`.
- Commits: conventional-ish, concise, action-oriented. One logical change per commit.
- **No merge commits on `main`.** Rebase on latest `origin/main` before pushing.
- Use American English spelling in code, comments, commits, and docs.

## Testing

- All tests live in `test/` and run under **vitest**. Tests are colocated by feature, not by file.
- Only test **pure helpers** — anything that does not call `osascript`. That means `build*Script` (AppleScript source generation), `parse*Output` (record parsing), `matchesQuery`, `escapeAppleScriptString`, `isoToAppleScriptDate`, `parseRecords`, zod schema validation, and error formatting.
- For the `osascript` bridge itself: don't mock it. If you need to exercise end-to-end behavior, do it manually on a macOS dev machine and note what you verified in the PR body.
- **Injection payloads are required** whenever you touch `escapeAppleScriptString`, any `build*Script`, or any new tool that concatenates user input into an AppleScript string. Check the existing tests for the payload patterns.
- Run `pnpm test:coverage` for a coverage report; aim to keep pure-helper coverage above 90%.

## Linting and formatting

We use **oxlint** + **oxfmt** — fast, opinionated, no config surgery needed for normal contributions. Before pushing:

```bash
pnpm lint         # oxlint
pnpm format:check # oxfmt --check
```

Or fix in place:

```bash
pnpm lint:fix
pnpm format
```

Knip is the dead-code / unused-dep gate:

```bash
pnpm knip
```

If knip flags something legitimate (e.g. a new public export), add the entry to `knip.config.ts` rather than suppressing it inline.

## PR checklist

- [ ] `pnpm check` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` produces a working `dist/index.js`.
- [ ] New/changed behavior has unit-test coverage at the pure-helper layer.
- [ ] For any code path that concatenates user input into AppleScript: an injection payload test exists.
- [ ] README/CHANGELOG updated if user-visible behavior changed.
- [ ] PR description explains **why** (not just what). For bug fixes, include the failing-before/passing-after evidence.
- [ ] No unrelated drive-by refactors.

## Security vulnerabilities

**Do not open a public issue** for security bugs. See [`SECURITY.md`](SECURITY.md) for the private reporting path and the report format.

Likely vulnerability categories for this project:

- AppleScript injection in any new or changed tool.
- An untrusted tool-call field reaching `osascript` without passing through `escapeAppleScriptString` first.
- Anything that moves the transport off of stdio (adds a network listener, HTTP endpoint, IPC socket, etc.) without prominent docs.
- Anything that reads or writes outside Calendar.app (filesystem, env, process spawn beyond `osascript`).

## AI-assisted PRs

AI-assisted contributions are welcome. Please note in the PR description:

- [ ] Which tool wrote the diff (Claude, Codex, Cursor, etc.).
- [ ] Whether you ran the tests locally and what you verified manually.
- [ ] That you understand what the code does.

This is a small codebase — "I ran the tests" is a real statement here, not a rubber stamp.

## Current focus

- **Stability** — AppleScript edge cases (recurring events, timezones, `missing value` fields).
- **Ergonomics** — better error messages when permission is denied.
- **Safety** — injection test coverage for every new tool surface.

Anything bigger should probably be a separate MCP server.
