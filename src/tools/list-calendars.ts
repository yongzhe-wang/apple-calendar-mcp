import { parseRecords, RECORD_SEPARATOR, runAppleScript, UNIT_SEPARATOR } from "../applescript.js";
import type { CalendarInfo } from "../types.js";

const SCRIPT = `
tell application "Calendar"
  set out to ""
  set rs to "${RECORD_SEPARATOR}"
  set us to "${UNIT_SEPARATOR}"
  repeat with c in calendars
    set calName to (name of c as string)
    set calWritable to (writable of c)
    set writeFlag to "false"
    if calWritable then set writeFlag to "true"
    set out to out & calName & us & writeFlag & rs
  end repeat
  return out
end tell
`;

export async function listCalendars(): Promise<CalendarInfo[]> {
  const raw = await runAppleScript(SCRIPT);
  return parseRecords(raw).map(([name, writable]) => ({
    name: name ?? "",
    writable: writable === "true",
  }));
}
