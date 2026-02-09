"use client";

import WorkflowInfoMenu from "@/components/workflows/WorkflowInfoMenu";

type Workflow = {
  id: string;
  name: string;
  created_at: string;
};

function formatDateISO(dateString: string) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function WorkflowCard({
  workflow,
  onRename,
  onDelete,
}: {
  workflow: Workflow;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  return (
    <a
      href={`/workflows/${workflow.id}`}
      style={{
        border: "1px solid #e2e2e2",
        borderRadius: 12,
        padding: 16,
        textDecoration: "none",
        color: "#111111",
        background: "#ffffff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ marginBottom: 6 }}>{workflow.name}</h3>
          <p style={{ color: "#444444", fontSize: 14 }}>
            Created {formatDateISO(workflow.created_at)}
          </p>
        </div>
        <div
          onClick={(event) => event.preventDefault()}
          style={{ display: "flex" }}
        >
          <WorkflowInfoMenu
            initialName={workflow.name}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      </div>
    </a>
  );
}
