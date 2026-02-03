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

export default function WorkflowEditorClient({
  initialNodes,
  addNodeAction,
}: {
  initialNodes: DbNode[];
  addNodeAction: (formData: FormData) => Promise<DbNode>;
}) {
  const [nodes, setNodes] = useState<DbNode[]>(initialNodes);

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.position - b.position),
    [nodes]
  );

  return (
    <>
      <FlowCanvas nodes={sortedNodes} />
      <AddNodeForm
        action={addNodeAction}
        onAdded={(newNode) => {
          setNodes((prev) => [...prev, newNode]);
        }}
      />
    </>
  );
}
