import { Handle, Position } from "reactflow";

export default function TriggerNode({ data }: any) {
  return (
    <div style={{ padding: 10, border: "1px solid #555", borderRadius: 6 }}>
      <strong>Trigger</strong>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
