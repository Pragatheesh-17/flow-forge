import { Handle, Position } from "reactflow";

export default function RetryNode() {
  return (
    <div style={{ padding: 10, border: "1px solid #555", borderRadius: 6 }}>
      <strong>Retry</strong>
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Wrap next node on failure</div>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
