import { Handle, Position } from "reactflow";

export default function ConditionalNode() {
  return (
    <div
      style={{
        padding: 10,
        border: "1px solid #555",
        borderRadius: 6,
        minWidth: 140,
        position: "relative",
      }}
    >
      <strong>If</strong>
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>True / False Branch</div>

      <Handle type="target" position={Position.Left} />
      <Handle
        id="true"
        type="source"
        position={Position.Right}
        style={{ top: "35%", background: "#0ea5e9" }}
      />
      <Handle
        id="false"
        type="source"
        position={Position.Right}
        style={{ top: "70%", background: "#f97316" }}
      />

      <div
        style={{
          position: "absolute",
          right: -34,
          top: "26%",
          fontSize: 10,
          color: "#0ea5e9",
        }}
      >
        TRUE
      </div>
      <div
        style={{
          position: "absolute",
          right: -36,
          top: "62%",
          fontSize: 10,
          color: "#f97316",
        }}
      >
        FALSE
      </div>
    </div>
  );
}
