import {
  escapeAppleScriptString,
  isoToAppleScriptDate,
  RECORD_SEPARATOR,
  runAppleScript,
  UNIT_SEPARATOR,
} from "../applescript.js";
import type { CalendarEvent, CreateEventArgs } from "../types.js";
import { listCalendars } from "./list-calendars.js";

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
  set evStart to ((start date of newEv) - (date "Thursday, January 1, 1970 at 12:00:00 AM")) as integer
  set evEnd to ((end date of newEv) - (date "Thursday, January 1, 1970 at 12:00:00 AM")) as integer
  set evAllDay to (allday event of newEv)
  set allDayFlag to "false"
  if evAllDay then set allDayFlag to "true"
  return (evId as string) & us & (summary of newEv as string) & us & (evStart as string) & us & (evEnd as string) & us & allDayFlag & us & (location of newEv as string) & us & (description of newEv as string) & us & (name of targetCal as string) & us & (url of newEv as string)
end tell
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
  const calendarName = args.calendar_name ?? (await resolveDefaultCalendar());
  const script = buildCreateEventScript({ ...args, calendar_name: calendarName });
  const raw = await runAppleScript(script);
  const fields = raw.split(UNIT_SEPARATOR);
  const [id, title, start, end, allDay, location, notes, calName, url] = fields;
  const startMs = Number(start) * 1000;
  const endMs = Number(end) * 1000;
  const event: CalendarEvent = {
    id: id ?? "",
    title: title ?? "",
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    all_day: allDay === "true",
    calendar_name: calName ?? calendarName,
  };
  if (location) event.location = location;
  if (notes) event.notes = notes;
  if (url) event.url = url;
  return event;
}
