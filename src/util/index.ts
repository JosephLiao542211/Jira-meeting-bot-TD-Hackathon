export type Color = "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "gray";

const CODES: Record<Color, string> = {
  red:     "\x1b[31m",
  green:   "\x1b[32m",
  yellow:  "\x1b[33m",
  blue:    "\x1b[34m",
  magenta: "\x1b[35m",
  cyan:    "\x1b[36m",
  gray:    "\x1b[90m",
};

const RESET = "\x1b[0m";

function timestamp(): string {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

export function log(tag: string, message: string, color: Color = "gray"): void {
  if (process.env.ENV !== "DEV") return;
  console.log(`${CODES[color]}[${timestamp()}][${tag}] ${message}${RESET}`);
}
