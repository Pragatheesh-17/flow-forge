"use client";

import { useMemo, useState } from "react";
import FlowCanvas from "@/components/canvas/FlowCanvas";
import AddNodeForm from "@/components/canvas/AddNodeForm";

type DbNode = {
  id: string;
  type: string;
  position: number;
  config?: any;
};

type DbEdge = {
  id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle?: string | null;
  target_handle?: string | null;
};

type NodeRun = {
  id: string;
  node_id: string;
  input: any;
  output: any;
  created_at?: string;
};

type WorkflowSchedule = {
  id: string;
  workflow_id: string;
  enabled: boolean;
  cron_expression: string;
  timezone: string;
  next_run_at?: string | null;
  last_run_at?: string | null;
  last_status?: string | null;
  last_error?: string | null;
};

export default function WorkflowEditorClient({
  initialNodes,
  initialEdges,
  initialSchedule,
  initialNodeRuns,
  latestRunAt,
  addNodeAction,
  addEdgeAction,
  saveScheduleAction,
  deleteNodeAction,
  deleteEdgeAction,
}: {
  initialNodes: DbNode[];
  initialEdges: DbEdge[];
  initialSchedule: WorkflowSchedule | null;
  initialNodeRuns: NodeRun[];
  latestRunAt: string | null;
  addNodeAction: (formData: FormData) => Promise<DbNode>;
  addEdgeAction: (
    source: string,
    target: string,
    sourceHandle?: string | null,
    targetHandle?: string | null
  ) => Promise<DbEdge>;
  saveScheduleAction: (schedule: {
    enabled: boolean;
    cron_expression: string;
    timezone: string;
  }) => Promise<WorkflowSchedule>;
  deleteNodeAction: (nodeId: string) => Promise<void>;
  deleteEdgeAction: (edgeId: string) => Promise<void>;
}) {
  const [nodes, setNodes] = useState<DbNode[]>(initialNodes);
  const [edges, setEdges] = useState<DbEdge[]>(initialEdges);
  const [nodeRuns] = useState<NodeRun[]>(initialNodeRuns);
  const [schedule, setSchedule] = useState<WorkflowSchedule | null>(initialSchedule);
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(
    initialSchedule?.enabled ?? false
  );
  const [scheduleCron, setScheduleCron] = useState<string>(
    initialSchedule?.cron_expression ?? "*/5 * * * *"
  );
  const [scheduleTimezone, setScheduleTimezone] = useState<string>(
    initialSchedule?.timezone ?? "UTC"
  );
  const [savingSchedule, setSavingSchedule] = useState(false);

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.position - b.position),
    [nodes]
  );

  return (
    <>
      <FlowCanvas
        nodes={sortedNodes}
        edges={edges}
        nodeRuns={nodeRuns}
        latestRunAt={latestRunAt}
        addEdgeAction={addEdgeAction}
        deleteNodeAction={deleteNodeAction}
        deleteEdgeAction={deleteEdgeAction}
        onEdgeAdded={(edge) => {
          setEdges((prev) => [...prev, edge]);
        }}
        onEdgesDeleted={(ids) => {
          setEdges((prev) => prev.filter((edge) => !ids.includes(edge.id)));
        }}
        onNodesDeleted={(ids) => {
          setNodes((prev) => prev.filter((node) => !ids.includes(node.id)));
          setEdges((prev) =>
            prev.filter(
              (edge) =>
                !ids.includes(edge.source_node_id) &&
                !ids.includes(edge.target_node_id)
            )
          );
        }}
      />
      <AddNodeForm
        action={addNodeAction}
        onAdded={(newNode) => {
          setNodes((prev) => [...prev, newNode]);
        }}
      />
      <div style={{ marginTop: 16, border: "1px solid #333", padding: 12, borderRadius: 8 }}>
        <h4 style={{ marginTop: 0 }}>Schedule (Cron)</h4>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
            />
            Enabled
          </label>
        </div>
        <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
          <label>
            Cron Expression
            <input
              value={scheduleCron}
              onChange={(e) => setScheduleCron(e.target.value)}
              placeholder="*/5 * * * *"
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label>
            Timezone
            <input
              value={scheduleTimezone}
              onChange={(e) => setScheduleTimezone(e.target.value)}
              placeholder="UTC"
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
        </div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
          Example: `*/5 * * * *` (every 5 minutes), timezone like `UTC` or `Asia/Kolkata`.
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <button
            disabled={savingSchedule}
            onClick={async () => {
              setSavingSchedule(true);
              try {
                const saved = await saveScheduleAction({
                  enabled: scheduleEnabled,
                  cron_expression: scheduleCron,
                  timezone: scheduleTimezone,
                });
                setSchedule(saved);
                alert("Schedule saved");
              } catch (err) {
                alert(err instanceof Error ? err.message : "Failed to save schedule");
              } finally {
                setSavingSchedule(false);
              }
            }}
          >
            {savingSchedule ? "Saving..." : "Save Schedule"}
          </button>
        </div>
        {schedule && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
            <div>Next Run: {schedule.next_run_at ?? "Not scheduled"}</div>
            <div>Last Run: {schedule.last_run_at ?? "Never"}</div>
            <div>Status: {schedule.last_status ?? "N/A"}</div>
            {schedule.last_error ? <div>Last Error: {schedule.last_error}</div> : null}
          </div>
        )}
      </div>
    </>
  );
}
