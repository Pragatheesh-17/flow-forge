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
};

type NodeRun = {
  id: string;
  node_id: string;
  input: any;
  output: any;
  created_at?: string;
};

export default function WorkflowEditorClient({
  initialNodes,
  initialEdges,
  initialNodeRuns,
  latestRunAt,
  addNodeAction,
  addEdgeAction,
  deleteNodeAction,
  deleteEdgeAction,
}: {
  initialNodes: DbNode[];
  initialEdges: DbEdge[];
  initialNodeRuns: NodeRun[];
  latestRunAt: string | null;
  addNodeAction: (formData: FormData) => Promise<DbNode>;
  addEdgeAction: (source: string, target: string) => Promise<DbEdge>;
  deleteNodeAction: (nodeId: string) => Promise<void>;
  deleteEdgeAction: (edgeId: string) => Promise<void>;
}) {
  const [nodes, setNodes] = useState<DbNode[]>(initialNodes);
  const [edges, setEdges] = useState<DbEdge[]>(initialEdges);
  const [nodeRuns, setNodeRuns] = useState<NodeRun[]>(initialNodeRuns);

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
    </>
  );
}
