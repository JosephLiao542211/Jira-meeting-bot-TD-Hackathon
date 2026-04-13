export const config = {
  model: "gemini-3.1-flash-lite-preview",
  maxTurns: 7,
  /** Wait this many ms after the last transcript line before processing. */
  debounceMs: 5_000,
  thresholds: {
    confidence: 0.7,
  },
  audio: {
    format: "pcm16",
    sampleRate: 16000,
  },
} as const;
