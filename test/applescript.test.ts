import { describe, expect, it } from "vitest";
import {
  escapeAppleScriptString,
  isoToAppleScriptDate,
  parseRecords,
  RECORD_SEPARATOR,
  UNIT_SEPARATOR,
} from "../src/applescript.js";

describe("escapeAppleScriptString", () => {
  it("wraps simple strings in double quotes", () => {
    expect(escapeAppleScriptString("hello")).toBe('"hello"');
  });

  it("escapes embedded double quotes", () => {
    expect(escapeAppleScriptString('say "hi"')).toBe('"say \\"hi\\""');
  });

  it("escapes backslashes before quotes to prevent injection", () => {
    expect(escapeAppleScriptString("a\\b")).toBe('"a\\\\b"');
  });

  it("neutralizes AppleScript string-escape injection attempts", () => {
    // Attempt to close the string and run arbitrary commands.
    const malicious = '"; do shell script "rm -rf /"; --';
    const escaped = escapeAppleScriptString(malicious);
    expect(escaped).toBe('"\\"; do shell script \\"rm -rf /\\"; --"');
    // Every internal quote should be backslash-escaped.
    const inner = escaped.slice(1, -1);
    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === '"') {
        expect(inner[i - 1]).toBe("\\");
      }
    }
  });

  it("handles empty strings", () => {
    expect(escapeAppleScriptString("")).toBe('""');
  });

  it("preserves unicode and newlines without breaking quoting", () => {
    const input = "café\n中文";
    const escaped = escapeAppleScriptString(input);
    expect(escaped).toBe('"café\n中文"');
  });
});

describe("isoToAppleScriptDate", () => {
  it("produces an AppleScript expression using epoch seconds", () => {
    const out = isoToAppleScriptDate("1970-01-01T00:00:01Z");
    expect(out).toContain("+ 1)");
    expect(out).toContain("(current date)");
  });

  it("converts a UTC timestamp to the correct seconds", () => {
    const out = isoToAppleScriptDate("2026-01-01T00:00:00Z");
    const expected = Math.floor(Date.UTC(2026, 0, 1) / 1000);
    expect(out).toContain(`+ ${expected})`);
  });

  it("handles ISO dates with timezone offsets", () => {
    const out = isoToAppleScriptDate("2026-04-21T10:30:00-07:00");
    const expected = Math.floor(Date.parse("2026-04-21T10:30:00-07:00") / 1000);
    expect(out).toContain(`+ ${expected})`);
  });

  it("throws on invalid ISO strings", () => {
    expect(() => isoToAppleScriptDate("not-a-date")).toThrow(/Invalid/);
  });
});

describe("parseRecords", () => {
  it("returns empty for empty string", () => {
    expect(parseRecords("")).toEqual([]);
  });

  it("splits on record and unit separators", () => {
    const raw = `a${UNIT_SEPARATOR}b${RECORD_SEPARATOR}c${UNIT_SEPARATOR}d${RECORD_SEPARATOR}`;
    expect(parseRecords(raw)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("handles trailing record separator without creating empty rows", () => {
    const raw = `x${UNIT_SEPARATOR}y${RECORD_SEPARATOR}`;
    expect(parseRecords(raw)).toEqual([["x", "y"]]);
  });

  it("preserves empty fields", () => {
    const raw = `a${UNIT_SEPARATOR}${UNIT_SEPARATOR}c${RECORD_SEPARATOR}`;
    expect(parseRecords(raw)).toEqual([["a", "", "c"]]);
  });
});
