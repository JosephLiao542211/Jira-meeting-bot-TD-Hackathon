export interface Ticket {
  summary: string;
  description?: string;
  type?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
}

export interface Proposal {
  id?: string;
  botId?: string;
  summary: string;
  ticket: Ticket;
}

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
