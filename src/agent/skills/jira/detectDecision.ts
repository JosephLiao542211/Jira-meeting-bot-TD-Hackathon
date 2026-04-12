export interface Decision {
  summary: string;
}

export function detectDecision(buffer: string[]): Decision | null {
  // TODO: use Gemini / LLM to detect decisions in buffer
  return null;
}
