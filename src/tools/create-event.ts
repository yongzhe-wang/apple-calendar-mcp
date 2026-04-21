import {
  escapeAppleScriptString,
  isoToAppleScriptDate,
  RECORD_SEPARATOR,
  runAppleScript,
  UNIT_SEPARATOR,
} from "../applescript.js";
import type { CalendarEvent, CreateEventArgs } from "../types.js";
import { listCalendars } from "./list-calendars.js";

export function normalizeCreateEventDuration(args: CreateEventArgs): CreateEventArgs {
  const startMs = Date.parse(args.start_date);
  const endMs = Date.parse(args.end_date);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return args;
  }
  if (endMs - startMs >= 60 * 60 * 1000) {
    return args;
  }
  // Default short meeting requests to a full hour so the MCP matches the user's calendar preference.
  return {
    ...args,
    end_date: new Date(startMs + 60 * 60 * 1000).toISOString(),
  };
}

export function buildCreateEventScript(args: CreateEventArgs & { calendar_name: string }): string {
  const title = escapeAppleScriptString(args.title);
  const calName = escapeAppleScriptString(args.calendar_name);
  const start = isoToAppleScriptDate(args.start_date);
  const end = isoToAppleScriptDate(args.end_date);
  const location = args.location ? escapeAppleScriptString(args.location) : '""';
  const notes = args.notes ? escapeAppleScriptString(args.notes) : '""';
  const url = args.url ? escapeAppleScriptString(args.url) : '""';
  const allDay = args.all_day === true ? "true" : "false";

  return `
set us to "${UNIT_SEPARATOR}"
set rs to "${RECORD_SEPARATOR}"
tell application "Calendar"
  set targetCal to first calendar whose name is ${calName}
  tell targetCal
    set newEv to make new event with properties {summary:${title}, start date:${start}, end date:${end}, location:${location}, description:${notes}, url:${url}, allday event:${allDay}}
  end tell
  set evId to (uid of newEv)
  set evStart to my localDateStamp(start date of newEv)
  set evEnd to my localDateStamp(end date of newEv)
  set evAllDay to (allday event of newEv)
  set allDayFlag to "false"
  if evAllDay then set allDayFlag to "true"
  return (evId as string) & us & (summary of newEv as string) & us & (evStart as string) & us & (evEnd as string) & us & allDayFlag & us & (location of newEv as string) & us & (description of newEv as string) & us & (name of targetCal as string) & us & (url of newEv as string)
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

async function resolveDefaultCalendar(): Promise<string> {
  const cals = await listCalendars();
  const writable = cals.find((c) => c.writable);
  if (!writable) {
    throw new Error(
      "No writable calendar found. Enable at least one writable calendar in Calendar.app.",
    );
  }
  return writable.name;
}

export async function createEvent(args: CreateEventArgs): Promise<CalendarEvent> {
  const normalizedArgs = normalizeCreateEventDuration(args);
  const calendarName = normalizedArgs.calendar_name ?? (await resolveDefaultCalendar());
  const script = buildCreateEventScript({ ...normalizedArgs, calendar_name: calendarName });
  const raw = await runAppleScript(script);
  const fields = raw.split(UNIT_SEPARATOR);
  const [id, title, start, end, allDay, location, notes, calName, url] = fields;
  const startDate = parseLocalDateTime(start);
  const endDate = parseLocalDateTime(end);
  const event: CalendarEvent = {
    id: id ?? "",
    title: title ?? "",
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    all_day: allDay === "true",
    calendar_name: calName ?? calendarName,
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
