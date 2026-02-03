import TriggerNode from "./TriggerNode";
import AiNode from "./AiNode";
import HttpNode from "./HttpNode";
import RagNode from "./RagNode";

export const nodeTypes = {
  TRIGGER: TriggerNode,
  AI_TRANSFORM: AiNode,
  HTTP_REQUEST: HttpNode,
  RAG_QA: RagNode,
};
