import { escapeAppleScriptString, runAppleScript } from "../applescript.js";
import type { DeleteEventArgs } from "../types.js";

export function buildDeleteEventScript(args: DeleteEventArgs): string {
  const evId = escapeAppleScriptString(args.event_id);
  return `
set deleted to false
tell application "Calendar"
  repeat with cal in calendars
    try
      set ev to (first event of cal whose uid is ${evId})
      delete ev
      set deleted to true
      exit repeat
    on error
      -- not in this calendar
    end try
  end repeat
end tell
if deleted then
  return "ok"
else
  error "Event not found: ${args.event_id.replace(/"/g, '\\"')}"
end if
`;
}

export async function deleteEvent(args: DeleteEventArgs): Promise<{ deleted: true; id: string }> {
  const script = buildDeleteEventScript(args);
  await runAppleScript(script);
  return { deleted: true, id: args.event_id };
}
