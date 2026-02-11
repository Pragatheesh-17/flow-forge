export const NODE_TYPES = [
  "TRIGGER",
  "AI_TRANSFORM",
  "HTTP_REQUEST",
  "RAG_QA",
  "GMAIL",
] as const;

export type NodeType = (typeof NODE_TYPES)[number];
