import { Handle, Position } from "reactflow";

export default function JsonTransformNode() {
  return (
    <div style={{ padding: 10, border: "1px solid #555", borderRadius: 6 }}>
      <strong>JSON Transform</strong>
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Map input fields</div>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
