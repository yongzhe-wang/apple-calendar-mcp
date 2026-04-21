## Summary

Describe the problem and fix in 2–5 bullets:

- Problem:
- Why it matters:
- What changed:
- What did NOT change (scope boundary):

## Change type (select all)

- [ ] Bug fix
- [ ] Feature (new tool / new tool arg)
- [ ] Refactor required for the fix
- [ ] Docs
- [ ] Security hardening
- [ ] Chore / infra

## Scope (select all touched areas)

- [ ] `src/tools/**` — tool implementation
- [ ] `src/applescript.ts` — escaping / osascript bridge
- [ ] `src/types.ts` — zod schemas
- [ ] `src/index.ts` / `src/errors.ts` — server / errors
- [ ] `test/**` — tests
- [ ] Docs
- [ ] CI / tooling / config

## Linked issue

- Closes #
- Related #

## Root cause (if applicable)

For bug fixes, explain **why** this happened, not just what changed. Otherwise write `N/A`.

- Root cause:
- Missing detection / guardrail:

## Regression test

For bug fixes, name the smallest reliable test that locks this in. Otherwise write `N/A`.

- Target test or file:
- Scenario:

## User-visible / behavior changes

If none, write `None`.

## Security impact (required)

- New permissions or capabilities? (`Yes/No`)
- Any user-supplied string reaching `osascript` without `escapeAppleScriptString`? (`Yes/No`)
- Any output on `stdout` that isn't MCP protocol? (`Yes/No`)
- Any new `osascript` invocation path? (`Yes/No`)
- Any filesystem / network / child-process access beyond `osascript`? (`Yes/No`)
- If any `Yes`, explain the risk + mitigation:

## Repro + verification

### Environment

- macOS version:
- Node version:
- MCP client (Claude Code version, etc.):

### Steps

1.
2.
3.

### Expected

-

### Actual

-

## Evidence

Attach at least one:

- [ ] Failing test before + passing after
- [ ] Trace / log snippet
- [ ] Screenshot (for permission / Calendar.app behavior changes)

## Human verification (required)

What you personally verified (not just CI), and how:

- Verified scenarios:
- Edge cases checked:
- What you did **not** verify:

## Compatibility / migration

- Backward compatible tool schemas? (`Yes/No`)
- Any MCP client config change needed? (`Yes/No`)
- If yes, exact upgrade steps:

## AI-assisted PRs

If this PR was drafted with an AI coding assistant, note:

- [ ] Which tool (Claude / Codex / Cursor / …)
- [ ] Degree of human testing (untested / lightly / fully)
- [ ] You understand what the code does
