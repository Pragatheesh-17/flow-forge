"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

import { nodeTypes } from "./nodes";
import { horizontalLayout } from "@/lib/canvas/layout";
import NodeConfigPanel from "./NodeConfigPanel";
import { reorderNodes, updateNode } from "@/app/workflows/[id]/actions";

type DbNode = {
  id: string;
  type: string;
  position: number;
  pos_x?: number | null;
  pos_y?: number | null;
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

export default function FlowCanvas({
  nodes,
  edges: dbEdges,
  nodeRuns,
  latestRunAt,
  addEdgeAction,
  deleteNodeAction,
  deleteEdgeAction,
  onEdgeAdded,
  onEdgesDeleted,
  onNodesDeleted,
}: {
  nodes: DbNode[];
  edges: DbEdge[];
  nodeRuns: NodeRun[];
  latestRunAt: string | null;
  addEdgeAction: (
    source: string,
    target: string,
    sourceHandle?: string | null,
    targetHandle?: string | null
  ) => Promise<DbEdge>;
  deleteNodeAction: (nodeId: string) => Promise<void>;
  deleteEdgeAction: (edgeId: string) => Promise<void>;
  onEdgeAdded?: (edge: DbEdge) => void;
  onEdgesDeleted?: (ids: string[]) => void;
  onNodesDeleted?: (ids: string[]) => void;
}) {
  const [dbNodes, setDbNodes] = useState<DbNode[]>(nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    setDbNodes(nodes);
  }, [nodes]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setFlowNodes((prev) => {
      if (prev.length === 0 && dbNodes.length > 0) {
        const hasStoredPositions = dbNodes.some(
          (node) =>
            typeof node.pos_x === "number" && typeof node.pos_y === "number"
        );

        if (hasStoredPositions) {
          return dbNodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: {
              x: typeof node.pos_x === "number" ? node.pos_x : 0,
              y: typeof node.pos_y === "number" ? node.pos_y : 0,
            },
            data: node,
          }));
        }

        const layout = horizontalLayout(
          dbNodes.map((node) => ({
            id: node.id,
            position: node.position,
          }))
        );

        return dbNodes.map((node) => {
          const pos = layout.find((entry) => entry.id === node.id);
          return {
            id: node.id,
            type: node.type,
            position: pos?.position ?? { x: 0, y: 0 },
            data: node,
          };
        });
      }

      const prevById = new Map(prev.map((node) => [node.id, node]));
      const maxX =
        prev.length > 0
          ? Math.max(...prev.map((node) => node.position.x))
          : 100;
      const gapX = 250;
      let newIndex = 0;

      return dbNodes.map((node) => {
        const existing = prevById.get(node.id);
        if (existing) {
          return {
            ...existing,
            type: node.type,
            data: node,
          };
        }

        newIndex += 1;
        return {
          id: node.id,
          type: node.type,
          position: { x: maxX + gapX * newIndex, y: 100 },
          data: node,
        };
      });
    });
  }, [dbNodes, setFlowNodes]);

  useEffect(() => {
    const nodeIds = new Set(dbNodes.map((node) => node.id));
    setEdges(
      dbEdges
        .filter(
          (edge) =>
            nodeIds.has(edge.source_node_id) &&
            nodeIds.has(edge.target_node_id)
        )
        .map((edge) => ({
          id: edge.id,
          source: edge.source_node_id,
          target: edge.target_node_id,
          sourceHandle: edge.source_handle ?? undefined,
          targetHandle: edge.target_handle ?? undefined,
          label:
            edge.source_handle === "true"
              ? "TRUE"
              : edge.source_handle === "false"
              ? "FALSE"
              : undefined,
          animated: true,
        }))
    );
  }, [dbNodes, dbEdges, setEdges]);

  const selectedNode =
    selectedNodeId === null
      ? null
      : dbNodes.find((node) => node.id === selectedNodeId) ?? null;

  const outputByNodeId = useMemo(() => {
    const map = new Map<string, any>();
    for (const run of nodeRuns) {
      map.set(run.node_id, run.output);
    }
    return map;
  }, [nodeRuns]);

  const upstreamOutputs = useMemo(() => {
    if (!selectedNodeId) return [];
    const sourceIds = dbEdges
      .filter((edge) => edge.target_node_id === selectedNodeId)
      .map((edge) => edge.source_node_id);
    return sourceIds.map((id) => ({
      nodeId: id,
      output: outputByNodeId.get(id),
    }));
  }, [dbEdges, outputByNodeId, selectedNodeId]);

  const handleNodeClick = useCallback((_: any, node: { id: string }) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      await deleteNodeAction(nodeId);
      setDbNodes((prev) => prev.filter((node) => node.id !== nodeId));
      setSelectedNodeId(null);
      onNodesDeleted?.([nodeId]);
      setEdges((prev) =>
        prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );
    },
    [deleteNodeAction, onNodesDeleted, setEdges]
  );

  const handleSaveNode = useCallback(async (updatedNode: DbNode) => {
    await updateNode(updatedNode.id, {
      type: updatedNode.type,
      config: updatedNode.config ?? {},
    });

    setDbNodes((prev) =>
      prev.map((node) =>
        node.id === updatedNode.id
          ? {
              ...node,
              type: updatedNode.type,
              config: updatedNode.config ?? {},
            }
          : node
      )
    );
  }, []);

  const handleNodeDragStop = useCallback(async () => {
    const ordered = [...flowNodes].sort(
      (a, b) => a.position.x - b.position.x
    );

    const updates = ordered.map((node, index) => ({
      id: node.id,
      position: index,
      pos_x: node.position.x,
      pos_y: node.position.y,
    }));

    const sameOrder = updates.every((update) => {
      const current = dbNodes.find((node) => node.id === update.id);
      return (
        current?.position === update.position &&
        current?.pos_x === update.pos_x &&
        current?.pos_y === update.pos_y
      );
    });

    if (sameOrder) return;

    setDbNodes((prev) =>
      prev.map((node) => {
        const update = updates.find((u) => u.id === node.id);
        return update
          ? {
              ...node,
              position: update.position,
              pos_x: update.pos_x,
              pos_y: update.pos_y,
            }
          : node;
      })
    );

    await reorderNodes(updates);
  }, [dbNodes, flowNodes]);

  return (
    <div style={{ height: "600px", position: "relative" }}>
      <ReactFlow
        nodes={flowNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={async (connection) => {
          if (!connection.source || !connection.target) return;
          const created = await addEdgeAction(
            connection.source,
            connection.target,
            connection.sourceHandle ?? null,
            connection.targetHandle ?? null
          );
          onEdgeAdded?.(created);
          setEdges((prev) =>
            addEdge(
              {
                id: created.id,
                source: created.source_node_id,
                target: created.target_node_id,
                sourceHandle: created.source_handle ?? undefined,
                targetHandle: created.target_handle ?? undefined,
                label:
                  created.source_handle === "true"
                    ? "TRUE"
                    : created.source_handle === "false"
                    ? "FALSE"
                    : undefined,
                animated: true,
              },
              prev
            )
          );
        }}
        onNodesDelete={async (deleted) => {
          const ids = deleted.map((node) => node.id);
          if (ids.length === 0) return;
          await Promise.all(ids.map((id) => deleteNodeAction(id)));
          setDbNodes((prev) => prev.filter((node) => !ids.includes(node.id)));
          onNodesDeleted?.(ids);
        }}
        onEdgesDelete={async (deleted) => {
          const ids = deleted.map((edge) => edge.id);
          if (ids.length === 0) return;
          await Promise.all(ids.map((id) => deleteEdgeAction(id)));
          onEdgesDeleted?.(ids);
        }}
        deleteKeyCode={["Backspace", "Delete"]}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <NodeConfigPanel
        node={selectedNode}
        latestRunAt={latestRunAt}
        upstreamOutputs={upstreamOutputs}
        onClose={handleClosePanel}
        onSave={handleSaveNode}
        onDelete={handleDeleteNode}
      />
    </div>
  );
}
