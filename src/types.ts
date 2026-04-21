import { z } from "zod";

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
  message: "Must be a valid ISO 8601 date string",
});

export const CalendarInfoSchema = z.object({
  name: z.string(),
  writable: z.boolean(),
});

export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  all_day: z.boolean(),
  location: z.string().optional(),
  notes: z.string().optional(),
  calendar_name: z.string(),
  url: z.string().optional(),
});

export type CalendarInfo = z.infer<typeof CalendarInfoSchema>;
export type CalendarEvent = z.infer<typeof EventSchema>;

export const ListEventsInput = z.object({
  start_date: isoDate,
  end_date: isoDate,
  calendar_name: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(100),
});

export const SearchEventsInput = z.object({
  query: z.string().min(1),
  start_date: isoDate.optional(),
  end_date: isoDate.optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const CreateEventInput = z.object({
  title: z.string().min(1),
  start_date: isoDate,
  end_date: isoDate,
  calendar_name: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  url: z.string().optional(),
  all_day: z.boolean().optional(),
});

export const UpdateEventInput = z.object({
  event_id: z.string().min(1),
  title: z.string().optional(),
  start_date: isoDate.optional(),
  end_date: isoDate.optional(),
  calendar_name: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  url: z.string().optional(),
  all_day: z.boolean().optional(),
});

export const DeleteEventInput = z.object({
  event_id: z.string().min(1),
});

export type ListEventsArgs = z.infer<typeof ListEventsInput>;
export type SearchEventsArgs = z.infer<typeof SearchEventsInput>;
export type CreateEventArgs = z.infer<typeof CreateEventInput>;
export type UpdateEventArgs = z.infer<typeof UpdateEventInput>;
export type DeleteEventArgs = z.infer<typeof DeleteEventInput>;
