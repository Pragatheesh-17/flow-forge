import { Handle, Position } from "reactflow";

export default function AiNode({ data }: any) {
  return (
    <div style={{ padding: 10, border: "1px solid #555", borderRadius: 6 }}>
      <strong>AI</strong>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
