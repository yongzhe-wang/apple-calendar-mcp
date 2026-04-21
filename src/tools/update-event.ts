import {
  escapeAppleScriptString,
  isoToAppleScriptDate,
  RECORD_SEPARATOR,
  runAppleScript,
  UNIT_SEPARATOR,
} from "../applescript.js";
import type { CalendarEvent, UpdateEventArgs } from "../types.js";

export function normalizeUpdateEventDuration(args: UpdateEventArgs): UpdateEventArgs {
  if (!args.start_date || !args.end_date) {
    return args;
  }
  const startMs = Date.parse(args.start_date);
  const endMs = Date.parse(args.end_date);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return args;
  }
  if (endMs - startMs >= 60 * 60 * 1000) {
    return args;
  }
  // Only normalize when both bounds are present; partial updates should preserve the existing event span.
  return {
    ...args,
    end_date: new Date(startMs + 60 * 60 * 1000).toISOString(),
  };
}

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
  set targetCalName to ${escapeAppleScriptString(args.calendar_name)}
  if (name of hostCal as string) is not equal to targetCalName then
    set targetCal to first calendar whose name is targetCalName
    -- Rebind the event immediately after the move so later reads never keep a stale reference.
    move ev to targetCal
    set hostCal to targetCal
    set ev to first event of hostCal whose uid is ${evId}
  end if`
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
  ${moveClause}
end tell
tell application "Calendar"
  repeat with cal in calendars
    try
      set ev to (first event of cal whose uid is ${evId})
      set hostCal to cal
      exit repeat
    end try
  end repeat
  set evStart to my localDateStamp(start date of ev)
  set evEnd to my localDateStamp(end date of ev)
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

on localDateStamp(d)
  return (year of d as string) & "-" & my pad2(month of d as integer) & "-" & my pad2(day of d as integer) & "T" & my pad2(hours of d as integer) & ":" & my pad2(minutes of d as integer) & ":" & my pad2(seconds of d as integer)
end localDateStamp

on pad2(n)
  if n is less than 10 then
    return "0" & (n as string)
  end if
  return n as string
end pad2
`;
}

export async function updateEvent(args: UpdateEventArgs): Promise<CalendarEvent> {
  const script = buildUpdateEventScript(normalizeUpdateEventDuration(args));
  const raw = await runAppleScript(script);
  const [id, title, start, end, allDay, location, notes, calName, url] = raw.split(UNIT_SEPARATOR);
  const startDate = parseLocalDateTime(start);
  const endDate = parseLocalDateTime(end);
  const event: CalendarEvent = {
    id: id ?? "",
    title: title ?? "",
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    all_day: allDay === "true",
    calendar_name: calName ?? "",
  };
  if (location) {
    event.location = location;
  }
  if (notes) {
    event.notes = notes;
  }
  if (url) {
    event.url = url;
  }
  return event;
}

function parseLocalDateTime(value: string | undefined): Date {
  if (!value) {
    return new Date(Number.NaN);
  }
  return new Date(value);
}
