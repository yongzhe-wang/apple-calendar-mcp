export class AppleCalendarError extends Error {
  constructor(
    message: string,
    public readonly userFacing: string,
  ) {
    super(message);
    this.name = "AppleCalendarError";
  }
}

const PERMISSION_PATTERNS = [
  /not authorized/i,
  /(–|-)1743/,
  /(–|-)1744/,
  /osascript.*permission/i,
  /execution error/i,
];

export function isPermissionError(err: unknown): boolean {
  const msg = errorMessage(err);
  return PERMISSION_PATTERNS.some((p) => p.test(msg));
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function formatUserFacingError(err: unknown): string {
  if (err instanceof AppleCalendarError) return err.userFacing;
  if (isPermissionError(err)) {
    return [
      "macOS Calendar permission denied or Calendar.app not accessible.",
      "Grant permission in System Settings → Privacy & Security → Automation →",
      "your terminal/IDE (Terminal, iTerm, VS Code, etc.) → enable Calendar.",
      "If running via Claude Code, also check Privacy & Security → Calendars.",
    ].join(" ");
  }
  return `Calendar operation failed: ${errorMessage(err)}`;
}
