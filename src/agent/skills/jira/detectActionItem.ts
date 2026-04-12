export interface ActionItem {
  summary: string;
  assignee?: string;
}

export function detectActionItem(buffer: string[]): ActionItem | null {
  // TODO: use Gemini / LLM to detect action items in buffer
  return null;
}
