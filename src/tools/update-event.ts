import {
  escapeAppleScriptString,
  isoToAppleScriptDate,
  RECORD_SEPARATOR,
  runAppleScript,
  UNIT_SEPARATOR,
} from "../applescript.js";
import type { CalendarEvent, UpdateEventArgs } from "../types.js";

export function buildUpdateEventScript(args: UpdateEventArgs): string {
  const evId = escapeAppleScriptString(args.event_id);
  const setters: string[] = [];
  if (args.title !== undefined) {
    setters.push(`set summary of ev to ${escapeAppleScriptString(args.title)}`);
  }
  if (args.start_date !== undefined) {
    setters.push(`set start date of ev to ${isoToAppleScriptDate(args.start_date)}`);
  }
  if (args.end_date !== undefined) {
    setters.push(`set end date of ev to ${isoToAppleScriptDate(args.end_date)}`);
  }
  if (args.location !== undefined) {
    setters.push(`set location of ev to ${escapeAppleScriptString(args.location)}`);
  }
  if (args.notes !== undefined) {
    setters.push(`set description of ev to ${escapeAppleScriptString(args.notes)}`);
  }
  if (args.url !== undefined) {
    setters.push(`set url of ev to ${escapeAppleScriptString(args.url)}`);
  }
  if (args.all_day !== undefined) {
    setters.push(`set allday event of ev to ${args.all_day ? "true" : "false"}`);
  }

  const moveClause = args.calendar_name
    ? `
    tell application "Calendar"
      set targetCal to first calendar whose name is ${escapeAppleScriptString(args.calendar_name)}
      move ev to targetCal
    end tell`
    : "";

  return `
set us to "${UNIT_SEPARATOR}"
set rs to "${RECORD_SEPARATOR}"
set foundEv to missing value
set hostCal to missing value
tell application "Calendar"
  repeat with cal in calendars
    try
      set candidate to (first event of cal whose uid is ${evId})
      set foundEv to candidate
      set hostCal to cal
      exit repeat
    on error
      -- not in this calendar, continue
    end try
  end repeat
  if foundEv is missing value then
    error "Event not found: ${args.event_id.replace(/"/g, '\\"')}"
  end if
  set ev to foundEv
  ${setters.join("\n  ")}
end tell
${moveClause}
tell application "Calendar"
  repeat with cal in calendars
    try
      set ev to (first event of cal whose uid is ${evId})
      set hostCal to cal
      exit repeat
    end try
  end repeat
  set evStart to ((start date of ev) - (date "Thursday, January 1, 1970 at 12:00:00 AM")) as integer
  set evEnd to ((end date of ev) - (date "Thursday, January 1, 1970 at 12:00:00 AM")) as integer
  set evAllDay to (allday event of ev)
  set allDayFlag to "false"
  if evAllDay then set allDayFlag to "true"
  try
    set evLoc to (location of ev)
  on error
    set evLoc to ""
  end try
  try
    set evNotes to (description of ev)
  on error
    set evNotes to ""
  end try
  try
    set evUrl to (url of ev)
  on error
    set evUrl to ""
  end try
  return (uid of ev as string) & us & (summary of ev as string) & us & (evStart as string) & us & (evEnd as string) & us & allDayFlag & us & (evLoc as string) & us & (evNotes as string) & us & (name of hostCal as string) & us & (evUrl as string)
end tell
`;
}

export async function updateEvent(args: UpdateEventArgs): Promise<CalendarEvent> {
  const script = buildUpdateEventScript(args);
  const raw = await runAppleScript(script);
  const [id, title, start, end, allDay, location, notes, calName, url] = raw.split(UNIT_SEPARATOR);
  const startMs = Number(start) * 1000;
  const endMs = Number(end) * 1000;
  const event: CalendarEvent = {
    id: id ?? "",
    title: title ?? "",
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    all_day: allDay === "true",
    calendar_name: calName ?? "",
  };
  if (location) event.location = location;
  if (notes) event.notes = notes;
  if (url) event.url = url;
  return event;
}
