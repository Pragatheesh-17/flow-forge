"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WorkflowInfoMenu({
  initialName,
  onRename,
  onDelete,
}: {
  initialName: string;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleRename = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    await onRename(trimmed);
    setSaving(false);
    setOpen(false);
    router.refresh();
  };

  const handleDelete = async () => {
    const ok = confirm("Delete this workflow? This cannot be undone.");
    if (!ok) return;
    setSaving(true);
    await onDelete();
    setSaving(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #d0d0d0",
          background: "#f5f5f5",
          color: "#111",
        }}
      >
        ...
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            background: "#ffffff",
            border: "1px solid #e2e2e2",
            borderRadius: 12,
            padding: 12,
            minWidth: 220,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            color: "#111",
            boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
          }}
        >
          <label style={{ fontSize: 12, color: "#666" }}>
            Rename workflow
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #d0d0d0",
              background: "#ffffff",
              color: "#111",
            }}
          />
          <button
            onClick={handleRename}
            disabled={saving}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #d0d0d0",
              background: "#f3f3f3",
              color: "#111",
            }}
          >
            Save Name
          </button>
          <button
            onClick={handleDelete}
            disabled={saving}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e08a8a",
              background: "#fff1f1",
              color: "#7a1d1d",
            }}
          >
            Delete Workflow
          </button>
        </div>
      ) : null}
    </div>
  );
}
