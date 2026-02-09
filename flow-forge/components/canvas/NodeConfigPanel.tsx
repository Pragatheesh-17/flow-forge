"use client";

import { useState, useEffect } from "react";
import { NODE_TYPES } from "@/lib/constants/nodeTypes";

type NodeConfigPanelProps = {
  node: any | null;
  latestRunAt: string | null;
  upstreamOutputs: { nodeId: string; output: any }[];
  onClose: () => void;
  onSave: (updatedNode: any) => Promise<void>;
  onDelete: (nodeId: string) => Promise<void>;
};

export default function NodeConfigPanel({
  node,
  latestRunAt,
  upstreamOutputs,
  onClose,
  onSave,
  onDelete,
}: NodeConfigPanelProps) {
  const [type, setType] = useState<string>("");
  const [config, setConfig] = useState<string>("{}");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (node) {
      setType(node.type);
      setConfig(JSON.stringify(node.config ?? {}, null, 2));
    }
  }, [node]);

  if (!node) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...node,
        type,
        config: JSON.parse(config || "{}"),
      });
      onClose();
    } catch (err) {
      alert("Invalid JSON or save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!node) return;
    const ok = confirm("Delete this node and its edges?");
    if (!ok) return;
    await onDelete(node.id);
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        width: 360,
        height: "100vh",
        background: "#111",
        color: "#fff",
        padding: 16,
        borderLeft: "1px solid #333",
        zIndex: 50,
      }}
    >
      <h3>Node Settings</h3>

      <label>Node Type</label>
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        style={{ width: "100%", marginBottom: 12 }}
      >
        {NODE_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <label>Config (JSON)</label>
      <textarea
        value={config}
        onChange={(e) => setConfig(e.target.value)}
        rows={10}
        style={{ width: "100%", marginBottom: 12 }}
      />

      <h4 style={{ marginTop: 16 }}>Upstream Outputs</h4>
      {upstreamOutputs.length === 0 ? (
        <div style={{ fontSize: 12, color: "#bbb", marginBottom: 12 }}>
          No upstream outputs for this node.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {upstreamOutputs.map((entry) => (
            <div
              key={entry.nodeId}
              style={{
                background: "#0b0b0b",
                border: "1px solid #333",
                borderRadius: 6,
                padding: 8,
              }}
            >
              <div style={{ fontSize: 12, marginBottom: 6 }}>
                From node: {entry.nodeId}
              </div>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 12,
                  margin: 0,
                  color: "#e6e6e6",
                }}
              >
                {JSON.stringify(entry.output ?? null, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleDelete} style={{ marginLeft: "auto" }}>
          Delete
        </button>
      </div>
    </div>
  );
}
