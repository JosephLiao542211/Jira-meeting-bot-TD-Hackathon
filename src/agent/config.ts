export const config = {
  model: "gemini-2.0-flash-exp",
  thresholds: {
    confidence: 0.7,
  },
  audio: {
    format: "pcm16",
    sampleRate: 16000,
  },
} as const;
