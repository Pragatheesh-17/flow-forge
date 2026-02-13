export const NODE_TYPES = [
  "TRIGGER",
  "SLACK_TRIGGER",
  "AI_TRANSFORM",
  "HTTP_REQUEST",
  "RAG_QA",
  "GMAIL",
  "SLACK",
  "CONDITIONAL",
] as const;

export type NodeType = (typeof NODE_TYPES)[number];
