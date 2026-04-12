export interface BugReport {
  summary: string;
  description?: string;
}

export function detectBugReport(buffer: string[]): BugReport | null {
  // TODO: use Gemini / LLM to detect bug reports in buffer
  return null;
}
