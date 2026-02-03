type LayoutNode = {
  id: string;
  position: number; // workflow_nodes.position
};

export function horizontalLayout(
  nodes: LayoutNode[],
  options?: {
    startX?: number;
    startY?: number;
    gapX?: number;
  }
) {
  const startX = options?.startX ?? 100;
  const startY = options?.startY ?? 100;
  const gapX = options?.gapX ?? 250;

  return nodes
    .sort((a, b) => a.position - b.position)
    .map((node, index) => ({
      id: node.id,
      position: {
        x: startX + index * gapX,
        y: startY,
      },
    }));
}
