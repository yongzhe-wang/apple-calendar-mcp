import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock applescript.js BEFORE importing anything that depends on it.
vi.mock("../src/applescript.js", async () => {
  const actual =
    await vi.importActual<typeof import("../src/applescript.js")>("../src/applescript.js");
  return {
    ...actual,
    runAppleScript: vi.fn(),
  };
});

import { runAppleScript, UNIT_SEPARATOR } from "../src/applescript.js";
import { searchEvents } from "../src/tools/search-events.js";

const US = UNIT_SEPARATOR;
const RS = "\x1e";

function eventRecord(opts: {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  location?: string;
  notes?: string;
  calendar_name: string;
  url?: string;
  recurrence?: string;
}): string {
  return [
    opts.id,
    opts.title,
    opts.start,
    opts.end,
    opts.allDay ? "true" : "false",
    opts.location ?? "",
    opts.notes ?? "",
    opts.calendar_name,
    opts.url ?? "",
    opts.recurrence ?? "",
  ].join(US);
}

function calendarsFixture(cals: Array<{ name: string; writable: boolean }>): string {
  return cals.map((c) => `${c.name}${US}${c.writable ? "true" : "false"}`).join(RS) + RS;
}

const runAppleScriptMock = vi.mocked(runAppleScript);

beforeEach(() => {
  runAppleScriptMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("searchEvents — orchestrator-level CJK + fan-out coverage", () => {
  it("returns an event whose title contains a Chinese substring match", async () => {
    // listEvents fans out: first call is listCalendars, then one call per writable
    // calendar. We stub: Interview Meeting has the target event; Work has an
    // unrelated event that should not match.
    runAppleScriptMock.mockResolvedValueOnce(
      calendarsFixture([
        { name: "Interview Meeting", writable: true },
        { name: "Work", writable: true },
      ]),
    );
    runAppleScriptMock.mockResolvedValueOnce(
      eventRecord({
        id: "C4E95C0A-INTERVIEW-1",
        title: "Interview Meeting - 极佳科技 (WeChat)",
        start: "2026-04-28T22:30:00",
        end: "2026-04-28T23:30:00",
        calendar_name: "Interview Meeting",
      }) + RS,
    );
    runAppleScriptMock.mockResolvedValueOnce(
      eventRecord({
        id: "OTHER-1",
        title: "standup",
        start: "2026-04-22T10:00:00",
        end: "2026-04-22T10:30:00",
        calendar_name: "Work",
      }) + RS,
    );

    const results = await searchEvents({
      query: "极佳",
      start_date: "2026-04-20T00:00:00-04:00",
      end_date: "2026-05-05T23:59:59-04:00",
      limit: 50,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("C4E95C0A-INTERVIEW-1");
    expect(results[0]?.title).toContain("极佳");
    expect(results[0]?.calendar_name).toBe("Interview Meeting");
  });

  it("logs fan-out failures to stderr instead of silently dropping them", async () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    runAppleScriptMock.mockResolvedValueOnce(
      calendarsFixture([
        { name: "Interview Meeting", writable: true },
        { name: "Work", writable: true },
      ]),
    );
    // Interview Meeting listEvents succeeds with the target event.
    runAppleScriptMock.mockResolvedValueOnce(
      eventRecord({
        id: "INT-1",
        title: "Interview Meeting - 极佳科技",
        start: "2026-04-28T22:30:00",
        end: "2026-04-28T23:30:00",
        calendar_name: "Interview Meeting",
      }) + RS,
    );
    // Work listEvents rejects (simulating the osascript timeout that hid this bug).
    runAppleScriptMock.mockRejectedValueOnce(new Error("osascript failed: timed out after 60s"));

    const results = await searchEvents({
      query: "极佳",
      start_date: "2026-04-20T00:00:00-04:00",
      end_date: "2026-05-05T23:59:59-04:00",
      limit: 50,
    });

    // The successful calendar still returns results — the failure is logged, not swallowed.
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("INT-1");

    const writes = stderrSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(writes).toMatch(/calendar "Work" failed/);
    expect(writes).toMatch(/timed out/);

    stderrSpy.mockRestore();
  });

  it("returns events from every writable calendar in the fan-out", async () => {
    // Regression guard: make sure the fan-out flattens results from every
    // calendar rather than silently dropping some of them.
    runAppleScriptMock.mockResolvedValueOnce(
      calendarsFixture([
        { name: "Cal-A", writable: true },
        { name: "Cal-B", writable: true },
        { name: "Cal-C", writable: true },
      ]),
    );
    runAppleScriptMock.mockResolvedValueOnce(
      eventRecord({
        id: "A-1",
        title: "alpha match",
        start: "2026-04-22T09:00:00",
        end: "2026-04-22T09:30:00",
        calendar_name: "Cal-A",
      }) + RS,
    );
    runAppleScriptMock.mockResolvedValueOnce(
      eventRecord({
        id: "B-1",
        title: "beta match",
        start: "2026-04-22T10:00:00",
        end: "2026-04-22T10:30:00",
        calendar_name: "Cal-B",
      }) + RS,
    );
    runAppleScriptMock.mockResolvedValueOnce(
      eventRecord({
        id: "C-1",
        title: "gamma match",
        start: "2026-04-22T11:00:00",
        end: "2026-04-22T11:30:00",
        calendar_name: "Cal-C",
      }) + RS,
    );

    const results = await searchEvents({
      query: "match",
      start_date: "2026-04-22T00:00:00-04:00",
      end_date: "2026-04-22T23:59:59-04:00",
      limit: 50,
    });

    const calendars = results.map((r) => r.calendar_name).toSorted();
    expect(calendars).toEqual(["Cal-A", "Cal-B", "Cal-C"]);
  });
});
