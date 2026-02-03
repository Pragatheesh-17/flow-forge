"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

import { nodeTypes } from "./nodes";
import { createEdges } from "@/lib/canvas/transformers";
import { horizontalLayout } from "@/lib/canvas/layout";
import NodeConfigPanel from "./NodeConfigPanel";
import { reorderNodes, updateNode } from "@/app/workflows/[id]/actions";

type DbNode = {
  id: string;
  type: string;
  position: number;
  config?: any;
};

export default function FlowCanvas({ nodes }: { nodes: DbNode[] }) {
  const [dbNodes, setDbNodes] = useState<DbNode[]>(nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    setDbNodes(nodes);
  }, [nodes]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);

  useEffect(() => {
    setFlowNodes((prev) => {
      if (prev.length === 0 && dbNodes.length > 0) {
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

  const edges = useMemo(() => createEdges(dbNodes), [dbNodes]);

  const selectedNode =
    selectedNodeId === null
      ? null
      : dbNodes.find((node) => node.id === selectedNodeId) ?? null;

  const handleNodeClick = useCallback((_: any, node: { id: string }) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

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
    }));

    const sameOrder = updates.every((update) => {
      const current = dbNodes.find((node) => node.id === update.id);
      return current?.position === update.position;
    });

    if (sameOrder) return;

    setDbNodes((prev) =>
      prev.map((node) => {
        const update = updates.find((u) => u.id === node.id);
        return update ? { ...node, position: update.position } : node;
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
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <NodeConfigPanel
        node={selectedNode}
        onClose={handleClosePanel}
        onSave={handleSaveNode}
      />
    </div>
  );
}
