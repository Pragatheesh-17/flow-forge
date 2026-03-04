import { Handle, Position } from "reactflow";

export default function LoopNode() {
  return (
    <div style={{ padding: 10, border: "1px solid #555", borderRadius: 6, position: "relative" }}>
      <strong>Loop</strong>
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Iterate array items</div>

      <Handle type="target" position={Position.Left} />
      <Handle id="item" type="source" position={Position.Right} style={{ top: "35%", background: "#0ea5e9" }} />
      <Handle id="done" type="source" position={Position.Right} style={{ top: "70%", background: "#10b981" }} />
      <Handle id="error" type="source" position={Position.Right} style={{ top: "92%", background: "#ef4444" }} />
    </div>
  );
}
