import TriggerNode from "./TriggerNode";
import AiNode from "./AiNode";
import HttpNode from "./HttpNode";
import RagNode from "./RagNode";
import GmailNode from "./GmailNode";
import SlackNode from "./SlackNode";
import SlackTriggerNode from "./SlackTriggerNode";
import ConditionalNode from "./ConditionalNode";

export const nodeTypes = {
  TRIGGER: TriggerNode,
  SLACK_TRIGGER: SlackTriggerNode,
  AI_TRANSFORM: AiNode,
  HTTP_REQUEST: HttpNode,
  RAG_QA: RagNode,
  GMAIL: GmailNode,
  SLACK: SlackNode,
  CONDITIONAL: ConditionalNode,
};
