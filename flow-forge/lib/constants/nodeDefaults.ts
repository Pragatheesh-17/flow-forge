import { NodeType } from "./nodeTypes";

export function getDefaultNodeConfig(type: NodeType) {
  switch (type) {
    case "AI_TRANSFORM":
      return {
        prompt_template: "Transform the following input:\n\n{{input}}",
      };
    case "HTTP_REQUEST":
      return {
        url: "https://example.com/api",
        method: "POST",
        body: {
          input: "{{input}}",
        },
      };
    case "RAG_QA":
      return {
        top_k: 5,
        prompt_template:
          "Use the context below to answer the question.\n\nContext:\n{{context}}\n\nQuestion:\n{{question}}\n\nAnswer:",
      };
    case "TRIGGER":
    default:
      return {};
  }
}
