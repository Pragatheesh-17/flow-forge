"use client";

import { useState, useEffect } from "react";
import { NODE_TYPES } from "@/lib/constants/nodeTypes";

type NodeConfigPanelProps = {
  node: any | null;
  onClose: () => void;
  onSave: (updatedNode: any) => Promise<void>;
};

export default function NodeConfigPanel({
  node,
  onClose,
  onSave,
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

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
