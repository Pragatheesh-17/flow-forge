import { Handle, Position } from "reactflow";

export default function RetryNode() {
  return (
    <div style={{ padding: 10, border: "1px solid #555", borderRadius: 6, position: "relative" }}>
      <strong>Retry</strong>
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Wrap next node on failure</div>

      <Handle type="target" position={Position.Left} />
      <Handle id="success" type="source" position={Position.Right} style={{ top: "35%" }} />
      <Handle id="error" type="source" position={Position.Right} style={{ top: "70%", background: "#ef4444" }} />
    </div>
  );
}
