import type { GRLContract, GRLStage } from "./contracts";

export type GRLNodeMode = "features" | "evidence" | "relations" | "stages";
export type GRLEdgeMode = "all" | "circuits" | "relations" | "evidence_dense";
export type GRLGraphNode = { id: string; label: string; detail: string; stage: string; confidence: number; density: number; x: number; y: number };
export type GRLGraphEdge = { id: string; source: string; target: string; type: string; confidence: number; density: number; weight: number; sourceKind: "circuit" | "relation" };
export type GRLProjectedGraph = { nodes: GRLGraphNode[]; edges: GRLGraphEdge[]; stages: GRLStage[] };
export type GRLEdgeFilter = { mode?: GRLEdgeMode; minimumConfidence?: number; firstDegreeOf?: string };

export function deriveStages(contract: GRLContract): GRLStage[] {
  const stages = new Map((contract.stages ?? []).map((stage) => [stage.id, stage]));
  for (const feature of contract.features) if (!stages.has(feature.pipelineStage)) stages.set(feature.pipelineStage, { id: feature.pipelineStage, label: feature.pipelineStage.replaceAll("_", " ") });
  return [...stages.values()];
}

export function projectFeatureEdges(contract: GRLContract): GRLGraphEdge[] {
  return [
    ...contract.circuits.map((item) => ({ id: item.id, source: item.sourceFeatureId, target: item.targetFeatureId, type: item.type, confidence: item.confidence, density: item.evidenceDensity, weight: item.edgeWeight, sourceKind: "circuit" as const })),
    ...contract.relations.map((item) => ({ id: item.id, source: item.sourceNodeId, target: item.targetNodeId, type: item.type, confidence: item.confidence, density: item.evidenceIds?.length ?? 0, weight: item.confidence, sourceKind: "relation" as const })),
  ];
}

export function projectGraph(contract: GRLContract, mode: GRLNodeMode = "features"): GRLProjectedGraph {
  const stages = deriveStages(contract);
  const featureNodes = () => stages.flatMap((stage, column) => {
    const items = contract.features.filter((feature) => feature.pipelineStage === stage.id);
    return items.map((feature, row) => ({ id: feature.id, label: feature.label, detail: `${feature.kind} / evidence ${feature.evidenceDensity}`, stage: stage.label, confidence: feature.confidence, density: feature.evidenceDensity, x: 90 + column * (1020 / Math.max(stages.length - 1, 1)), y: 90 + row * (430 / Math.max(items.length - 1, 1)) }));
  });
  if (mode === "features") return { nodes: featureNodes(), edges: projectFeatureEdges(contract), stages };
  if (mode === "evidence") {
    const evidence = contract.evidence.map((item, index) => ({ id: item.id, label: item.excerpt.slice(0, 48) || item.evidenceType, detail: `${item.evidenceType} / ${item.sourcePath}`, stage: "Evidence", confidence: item.confidence, density: 1, x: 100 + (index % 5) * 240, y: 100 + Math.floor(index / 5) * 90 }));
    const edges = contract.evidence.map((item) => ({ id: `bind:${item.id}`, source: item.id, target: item.featureId, type: "supports", confidence: item.confidence, density: 1, weight: item.confidence, sourceKind: "circuit" as const }));
    return { nodes: [...evidence, ...featureNodes()], edges, stages };
  }
  if (mode === "relations") {
    const ids = [...new Set(contract.relations.flatMap((item) => [item.sourceNodeId, item.targetNodeId]))];
    const nodes = ids.map((id, index) => { const connected = contract.relations.filter((item) => item.sourceNodeId === id || item.targetNodeId === id); return { id, label: id.split(":").slice(1).join(":") || id, detail: `${id.split(":", 1)[0]} relation endpoint`, stage: "Relation", confidence: Math.max(...connected.map((item) => item.confidence)), density: connected.length, x: 90 + (index % 6) * 200, y: 80 + Math.floor(index / 6) * 70 }; });
    return { nodes, edges: projectFeatureEdges(contract).filter((edge) => edge.sourceKind === "relation"), stages };
  }
  const nodes = stages.map((stage, index) => ({ id: stage.id, label: stage.label, detail: stage.description ?? `${contract.features.filter((item) => item.pipelineStage === stage.id).length} features`, stage: stage.label, confidence: 1, density: contract.features.filter((item) => item.pipelineStage === stage.id).reduce((sum, item) => sum + item.evidenceDensity, 0), x: 100 + index * (1000 / Math.max(stages.length - 1, 1)), y: 300 }));
  const featureById = new Map(contract.features.map((item) => [item.id, item])); const grouped = new Map<string, GRLGraphEdge>();
  for (const edge of projectFeatureEdges(contract)) { const source = featureById.get(edge.source)?.pipelineStage; const target = featureById.get(edge.target)?.pipelineStage; if (!source || !target || source === target) continue; const key = `${source}:${target}:${edge.sourceKind}`; const current = grouped.get(key); if (current) { current.density += edge.density; current.weight += edge.weight; current.confidence = Math.max(current.confidence, edge.confidence); } else grouped.set(key, { ...edge, id: key, source, target }); }
  return { nodes, edges: [...grouped.values()], stages };
}

export function filterGraphEdges(edges: GRLGraphEdge[], filter: GRLEdgeFilter = {}): GRLGraphEdge[] {
  const mode = filter.mode ?? "all"; const minimum = filter.minimumConfidence ?? 0;
  return edges.filter((edge) => edge.confidence >= minimum)
    .filter((edge) => mode === "all" || mode === "evidence_dense" && edge.density >= 8 || mode === "circuits" && edge.sourceKind === "circuit" || mode === "relations" && edge.sourceKind === "relation")
    .filter((edge) => !filter.firstDegreeOf || edge.source === filter.firstDegreeOf || edge.target === filter.firstDegreeOf);
}

export function queryGraph(contract: GRLContract, nodeId: string, mode: GRLNodeMode = "features") {
  const graph = projectGraph(contract, mode); const node = graph.nodes.find((item) => item.id === nodeId); if (!node) return null;
  const edges = graph.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId); const neighborIds = new Set(edges.flatMap((edge) => [edge.source, edge.target]).filter((id) => id !== nodeId));
  return { node, edges, neighbors: graph.nodes.filter((item) => neighborIds.has(item.id)), evidence: contract.evidence.filter((item) => item.featureId === nodeId || edges.some((edge) => contract.circuits.find((circuit) => circuit.id === edge.id)?.evidenceIds?.includes(item.id))) };
}
