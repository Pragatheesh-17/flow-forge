"use client";

import { useState } from "react";
import { NODE_TYPES } from "@/lib/constants/nodeTypes";
import { updateNode } from "@/app/workflows/[id]/actions";

export default function NodeEditor({ node }: { node: any }) {
  const [type, setType] = useState(node.type);
  const [config, setConfig] = useState(
    JSON.stringify(node.config || {}, null, 2)
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateNode(node.id, {
      type,
      config: JSON.parse(config || "{}"),
    });
    setSaving(false);
  };

  return (
    <div
      style={{
        border: "1px solid #aaa",
        padding: 12,
        marginBottom: 12,
      }}
    >
      <p>
        <strong>Step {node.position + 1}</strong>
      </p>

      {/* Node type */}
      <label>Node Type</label>
      <br />
      <select value={type} onChange={(e) => setType(e.target.value)}>
        {NODE_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <br />
      <br />

      {/* Node config */}
      <label>Config (JSON for now)</label>
      <br />
      <textarea
        rows={6}
        cols={50}
        value={config}
        onChange={(e) => setConfig(e.target.value)}
      />

      <br />
      <br />

      <button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Node"}
      </button>
    </div>
  );
}
