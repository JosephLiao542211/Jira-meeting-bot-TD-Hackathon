import type { Proposal } from "./jira.js";

export interface Session {
  botId: string;
  transcriptBuffer: string[];
  pendingProposals: Map<string, Proposal>;
}

const sessions = new Map<string, Session>();

export function getSession(botId: string): Session {
  if (!sessions.has(botId)) {
    sessions.set(botId, { botId, transcriptBuffer: [], pendingProposals: new Map() });
  }
  return sessions.get(botId)!;
}

export function getSessions(): Map<string, Session> {
  return sessions;
}
