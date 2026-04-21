import {
  escapeAppleScriptString,
  isoToAppleScriptDate,
  parseRecords,
  RECORD_SEPARATOR,
  runAppleScript,
  UNIT_SEPARATOR,
} from "../applescript.js";
import type { CalendarEvent, ListEventsArgs } from "../types.js";

export function buildListEventsScript(args: ListEventsArgs): string {
  const startExpr = isoToAppleScriptDate(args.start_date);
  const endExpr = isoToAppleScriptDate(args.end_date);
  const limit = args.limit;
  const calendarFilter = args.calendar_name
    ? `if (name of cal as string) is not equal to ${escapeAppleScriptString(args.calendar_name)} then\n        -- skip\n      else`
    : "if true then";

  return `
set rs to "${RECORD_SEPARATOR}"
set us to "${UNIT_SEPARATOR}"
set startDate to ${startExpr}
set endDate to ${endExpr}
set maxItems to ${limit}
set collected to 0
set out to ""
tell application "Calendar"
  repeat with cal in calendars
    ${calendarFilter}
      set matchingEvents to (every event of cal whose start date is greater than or equal to startDate and start date is less than or equal to endDate)
      repeat with ev in matchingEvents
        if collected is greater than or equal to maxItems then exit repeat
        set evId to (uid of ev)
        set evTitle to (summary of ev)
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
        set evAllDay to (allday event of ev)
        set allDayFlag to "false"
        if evAllDay then set allDayFlag to "true"
        set evStart to ((start date of ev) - (date "Thursday, January 1, 1970 at 12:00:00 AM")) as integer
        set evEnd to ((end date of ev) - (date "Thursday, January 1, 1970 at 12:00:00 AM")) as integer
        set calName to (name of cal as string)
        set out to out & (evId as string) & us & (evTitle as string) & us & (evStart as string) & us & (evEnd as string) & us & allDayFlag & us & (evLoc as string) & us & (evNotes as string) & us & calName & us & (evUrl as string) & rs
        set collected to collected + 1
      end repeat
    end if
    if collected is greater than or equal to maxItems then exit repeat
  end repeat
end tell
return out
`;
}

export function parseEventsOutput(raw: string): CalendarEvent[] {
  return parseRecords(raw).map((fields) => {
    const [id, title, start, end, allDay, location, notes, calName, url] = fields;
    const startMs = Number(start) * 1000;
    const endMs = Number(end) * 1000;
    const event: CalendarEvent = {
      id: id ?? "",
      title: title ?? "",
      start: Number.isFinite(startMs) ? new Date(startMs).toISOString() : "",
      end: Number.isFinite(endMs) ? new Date(endMs).toISOString() : "",
      all_day: allDay === "true",
      calendar_name: calName ?? "",
    };
    if (location) event.location = location;
    if (notes) event.notes = notes;
    if (url) event.url = url;
    return event;
  });
}

export async function listEvents(args: ListEventsArgs): Promise<CalendarEvent[]> {
  const script = buildListEventsScript(args);
  const raw = await runAppleScript(script);
  return parseEventsOutput(raw);
}
