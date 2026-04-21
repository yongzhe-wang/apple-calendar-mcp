import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AppleCalendarError } from "./errors.js";

const execFileAsync = promisify(execFile);

// Record separator (0x1E) and Unit separator (0x1F) are ASCII control chars
// that virtually never appear in calendar data. We use them so fields and
// rows can contain commas, newlines, quotes — anything except these bytes —
// without breaking our parser.
export const RECORD_SEPARATOR = "\x1e";
export const UNIT_SEPARATOR = "\x1f";

const OSASCRIPT_TIMEOUT_MS = 30_000;
const OSASCRIPT_MAX_BUFFER = 16 * 1024 * 1024;

export async function runAppleScript(script: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("osascript", ["-e", script], {
      timeout: OSASCRIPT_TIMEOUT_MS,
      maxBuffer: OSASCRIPT_MAX_BUFFER,
    });
    return stdout.replace(/\n$/, "");
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
    const stderr = (e.stderr ?? "").toString().trim();
    const stdout = (e.stdout ?? "").toString().trim();
    const detail = stderr || stdout || e.message;
    throw new AppleCalendarError(`osascript failed: ${detail}`, buildFriendlyMessage(detail));
  }
}

function buildFriendlyMessage(detail: string): string {
  if (/not authorized/i.test(detail) || /-1743/.test(detail) || /-1744/.test(detail)) {
    return [
      "macOS denied Calendar access.",
      "Open System Settings → Privacy & Security → Automation,",
      "find your terminal/IDE, and enable Calendar.",
    ].join(" ");
  }
  if (/Calendar got an error/i.test(detail)) {
    return `Calendar.app error: ${detail}`;
  }
  return `AppleScript error: ${detail}`;
}

export function escapeAppleScriptString(s: string): string {
  const escaped = s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

// AppleScript's `date "..."` literal is locale-sensitive (en_US vs de_DE etc.),
// so we build a date from epoch seconds instead. This expression yields a
// proper AppleScript date object usable in `set start date of foo to ...`.
export function isoToAppleScriptDate(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) {
    throw new AppleCalendarError(
      `Invalid ISO date: ${iso}`,
      `Invalid date "${iso}". Expected ISO 8601 (e.g. 2026-04-21T14:30:00Z).`,
    );
  }
  const seconds = Math.floor(ts / 1000);
  return `((current date) - ((current date) - (date "Thursday, January 1, 1970 at 12:00:00 AM")) + ${seconds})`;
}

export function parseRecords(raw: string): string[][] {
  if (!raw) {
    return [];
  }
  return raw
    .split(RECORD_SEPARATOR)
    .filter((r) => r.length > 0)
    .map((r) => r.split(UNIT_SEPARATOR));
}
