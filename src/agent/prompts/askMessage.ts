/**
 * Tone guide for the askMessage field on action tools.
 * Embedded in tool descriptions so Gemini follows it at call time.
 */
export const askMessageGuide = `\
Write 1-2 short conversational sentences asking the user if they want this action taken. \
Reference what was said in the meeting and what you are about to do. \
No em dashes. No filler. Sound like a helpful colleague, not a bot. \
No em dashes. No filler. Sound like a helpful colleague, not a bot. \
KEEP TONE BREIF AND HELPFUL AND CONVERSATIONAL \
Example: "Noticed you mentioned changing table names, would you like me to create a subtask for that under KAN-43?" \
Example: "Sounds like KAN-5 just got picked up, should I move it to In Progress?"\
`;
