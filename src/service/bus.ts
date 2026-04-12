import { EventEmitter } from "events";
import type { Session } from "./session.js";

export interface TranscriptEvent {
  botId: string;
  session: Session;
  line: string;
}

export const bus = new EventEmitter();
