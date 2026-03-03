import { Handle, Position } from "reactflow";

export default function DelayNode() {
  return (
    <div style={{ padding: 10, border: "1px solid #555", borderRadius: 6 }}>
      <strong>Delay</strong>
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Pause and resume later</div>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
