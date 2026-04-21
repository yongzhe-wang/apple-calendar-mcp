import type { CalendarEvent, SearchEventsArgs } from "../types.js";
import { listEvents } from "./list-events.js";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

export function matchesQuery(event: CalendarEvent, query: string): boolean {
  const q = query.toLowerCase();
  const fields = [event.title, event.location ?? "", event.notes ?? ""];
  return fields.some((f) => f.toLowerCase().includes(q));
}

export async function searchEvents(args: SearchEventsArgs): Promise<CalendarEvent[]> {
  const now = Date.now();
  const start = args.start_date ?? new Date(now - THIRTY_DAYS).toISOString();
  const end = args.end_date ?? new Date(now + NINETY_DAYS).toISOString();

  // Pull a wider window with a high list-limit, then filter & cap in TS.
  // AppleScript has no case-insensitive substring predicate across multi-fields
  // without heroics; filtering 500 events locally is trivially fast.
  const candidates = await listEvents({
    start_date: start,
    end_date: end,
    limit: 500,
  });

  const matched = candidates.filter((e) => matchesQuery(e, args.query));
  return matched.slice(0, args.limit);
}
