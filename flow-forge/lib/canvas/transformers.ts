export function dbNodesToFlow(nodes: any[]) {
  return nodes.map((node, index) => ({
    id: node.id,
    type: node.type,
    position: {
      x: index * 250,
      y: 100,
    },
    data: {
      config: node.config,
      position: node.position,
    },
  }));
}

export function createEdges(nodes: any[]) {
  return nodes.slice(1).map((node, i) => ({
    id: `e-${nodes[i].id}-${node.id}`,
    source: nodes[i].id,
    target: node.id,
    animated: true,
  }));
}
