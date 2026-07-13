import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import type { GRLContract, GRLFeature } from "../contracts";
import { validateContract } from "../validation";

type NodeMode = "features" | "evidence" | "relations" | "stages";
type EdgeMode = "all" | "circuits" | "relations" | "evidence_dense";
type Node = { id: string; label: string; detail: string; stage: string; confidence: number; density: number; x: number; y: number };
type Edge = { id: string; source: string; target: string; type: string; confidence: number; density: number; weight: number; sourceKind: "circuit" | "relation" };

const GRLContext = createContext<GRLContract | null>(null);
export function GraphLabProvider({ contract, children }: { contract: GRLContract; children: React.ReactNode }) {
  return <GRLContext.Provider value={validateContract(contract)}>{children}</GRLContext.Provider>;
}
export function useGRLContract() {
  const value = useContext(GRLContext);
  if (!value) throw new Error("GraphLab must receive a contract or be wrapped in GraphLabProvider");
  return value;
}

function stagesFor(contract: GRLContract) {
  const supplied = new Map((contract.stages ?? []).map((stage) => [stage.id, stage]));
  for (const feature of contract.features) if (!supplied.has(feature.pipelineStage)) supplied.set(feature.pipelineStage, { id: feature.pipelineStage, label: feature.pipelineStage.replaceAll("_", " ") });
  return [...supplied.values()];
}
function featureNodes(contract: GRLContract, stages: ReturnType<typeof stagesFor>): Node[] {
  return stages.flatMap((stage, column) => {
    const items = contract.features.filter((feature) => feature.pipelineStage === stage.id);
    return items.map((feature, row) => ({ id: feature.id, label: feature.label, detail: `${feature.kind} / evidence ${feature.evidenceDensity}`, stage: stage.label, confidence: feature.confidence, density: feature.evidenceDensity, x: 90 + column * (1020 / Math.max(stages.length - 1, 1)), y: 90 + row * (430 / Math.max(items.length - 1, 1)) }));
  });
}
function evidenceNodes(contract: GRLContract): Node[] {
  return contract.evidence.map((item, index) => ({ id: item.id, label: item.excerpt.slice(0, 48) || item.evidenceType, detail: `${item.evidenceType} / ${item.sourcePath}`, stage: "Evidence", confidence: item.confidence, density: 1, x: 100 + (index % 5) * 240, y: 100 + Math.floor(index / 5) * 90 }));
}
function relationNodes(contract: GRLContract): Node[] {
  const ids = [...new Set(contract.relations.flatMap((item) => [item.sourceNodeId, item.targetNodeId]))];
  return ids.map((id, index) => ({ id, label: id.split(":").slice(1).join(":") || id, detail: `${id.split(":", 1)[0]} relation endpoint`, stage: "Relation", confidence: Math.max(...contract.relations.filter((item) => item.sourceNodeId === id || item.targetNodeId === id).map((item) => item.confidence)), density: contract.relations.filter((item) => item.sourceNodeId === id || item.targetNodeId === id).length, x: 90 + (index % 6) * 200, y: 80 + Math.floor(index / 6) * 70 }));
}
function stageNodes(contract: GRLContract, stages: ReturnType<typeof stagesFor>): Node[] {
  return stages.map((stage, index) => ({ id: stage.id, label: stage.label, detail: stage.description ?? `${contract.features.filter((item) => item.pipelineStage === stage.id).length} features`, stage: stage.label, confidence: 1, density: contract.features.filter((item) => item.pipelineStage === stage.id).reduce((sum, item) => sum + item.evidenceDensity, 0), x: 100 + index * (1000 / Math.max(stages.length - 1, 1)), y: 300 }));
}
function featureEdges(contract: GRLContract): Edge[] {
  return [
    ...contract.circuits.map((item) => ({ id: item.id, source: item.sourceFeatureId, target: item.targetFeatureId, type: item.type, confidence: item.confidence, density: item.evidenceDensity, weight: item.edgeWeight, sourceKind: "circuit" as const })),
    ...contract.relations.map((item) => ({ id: item.id, source: item.sourceNodeId, target: item.targetNodeId, type: item.type, confidence: item.confidence, density: item.evidenceIds?.length ?? 0, weight: item.confidence, sourceKind: "relation" as const })),
  ];
}
function evidenceEdges(contract: GRLContract): Edge[] {
  return contract.evidence.map((item) => ({ id: `bind:${item.id}`, source: item.id, target: item.featureId, type: "supports", confidence: item.confidence, density: 1, weight: item.confidence, sourceKind: "circuit" }));
}
function stageEdges(contract: GRLContract, stages: ReturnType<typeof stagesFor>): Edge[] {
  const featureById = new Map(contract.features.map((item) => [item.id, item]));
  const grouped = new Map<string, Edge>();
  for (const edge of featureEdges(contract)) {
    const source = featureById.get(edge.source)?.pipelineStage; const target = featureById.get(edge.target)?.pipelineStage;
    if (!source || !target || source === target) continue;
    const key = `${source}:${target}:${edge.sourceKind}`; const current = grouped.get(key);
    if (current) { current.density += edge.density; current.weight += edge.weight; current.confidence = Math.max(current.confidence, edge.confidence); }
    else grouped.set(key, { ...edge, id: key, source, target });
  }
  return [...grouped.values()].filter((edge) => stages.some((item) => item.id === edge.source) && stages.some((item) => item.id === edge.target));
}

export function GraphLab({ contract: directContract, title = "GRL" }: { contract?: GRLContract; title?: string }) {
  const context = useContext(GRLContext); const contract = useMemo(() => directContract ? validateContract(directContract) : context, [directContract, context]);
  if (!contract) throw new Error("GraphLab requires a contract");
  const [nodeMode, setNodeMode] = useState<NodeMode>("features"); const [edgeMode, setEdgeMode] = useState<EdgeMode>("all");
  const [selected, setSelected] = useState(""); const [search, setSearch] = useState(""); const [firstDegree, setFirstDegree] = useState(false);
  const [confidence, setConfidence] = useState(0); const svgRef = useRef<SVGSVGElement>(null); const stages = useMemo(() => stagesFor(contract), [contract]);
  const graph = useMemo(() => {
    if (nodeMode === "stages") return { nodes: stageNodes(contract, stages), edges: stageEdges(contract, stages) };
    if (nodeMode === "evidence") return { nodes: [...evidenceNodes(contract), ...featureNodes(contract, stages)], edges: evidenceEdges(contract) };
    if (nodeMode === "relations") return { nodes: relationNodes(contract), edges: featureEdges(contract).filter((edge) => edge.sourceKind === "relation") };
    return { nodes: featureNodes(contract, stages), edges: featureEdges(contract) };
  }, [contract, nodeMode, stages]);
  const matching = new Set(graph.nodes.filter((node) => node.label.toLowerCase().includes(search.toLowerCase())).map((node) => node.id));
  const activeId = selected || graph.nodes[0]?.id || ""; const nodeById = new Map(graph.nodes.map((node) => [node.id, node])); const active = nodeById.get(activeId);
  const edges = graph.edges.filter((edge) => edge.confidence >= confidence && (edgeMode === "all" || edgeMode === "evidence_dense" && edge.density >= 8 || edgeMode === "circuits" && edge.sourceKind === "circuit" || edgeMode === "relations" && edge.sourceKind === "relation")).filter((edge) => !firstDegree || edge.source === activeId || edge.target === activeId);
  function serializedSvg() { if (!svgRef.current) throw new Error("Graph SVG unavailable"); return new XMLSerializer().serializeToString(svgRef.current); }
  function download(href: string, filename: string) { const link = document.createElement("a"); link.href = href; link.download = filename; document.body.append(link); link.click(); link.remove(); }
  function exportSvg() { const blob = new Blob([serializedSvg()], { type: "image/svg+xml" }); const url = URL.createObjectURL(blob); download(url, `grl-${nodeMode}-${edgeMode}.svg`); setTimeout(() => URL.revokeObjectURL(url)); }
  async function exportPng() { const blob = new Blob([serializedSvg()], { type: "image/svg+xml" }); const url = URL.createObjectURL(blob); const image = new Image(); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = url; }); const canvas = document.createElement("canvas"); canvas.width = 2360; canvas.height = 1240; const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas unavailable"); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); download(canvas.toDataURL("image/png"), `grl-${nodeMode}-${edgeMode}.png`); }
  return <main className="grl-shell">
    <header className="grl-header"><div><h1>{title}</h1><p>{contract.dataset.title} · feature/evidence/circuit/relation explorer</p></div><div className="grl-actions"><button onClick={() => void exportPng()}>Capture PNG</button><button onClick={exportSvg}>Capture SVG</button></div></header>
    <section className="grl-controls">
      <div className="grl-segment">{(["features", "evidence", "relations", "stages"] as NodeMode[]).map((mode) => <button className={nodeMode === mode ? "active" : ""} key={mode} onClick={() => { setNodeMode(mode); setSelected(""); }}>{mode}</button>)}</div>
      <div className="grl-segment">{(["all", "circuits", "relations", "evidence_dense"] as EdgeMode[]).map((mode) => <button aria-label={`Filter ${mode}`} className={edgeMode === mode ? "active" : ""} key={mode} onClick={() => setEdgeMode(mode)}>{mode}</button>)}</div>
      <input aria-label="Search nodes" placeholder="Search nodes" value={search} onChange={(event) => setSearch(event.target.value)} />
      <label>Confidence <input aria-label="Minimum confidence" type="range" min="0" max="1" step="0.1" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /></label>
      <label><input type="checkbox" checked={firstDegree} onChange={(event) => setFirstDegree(event.target.checked)} /> First degree</label>
    </section>
    <section className="grl-metrics"><span>Nodes <b>{graph.nodes.length}</b></span><span>Visible edges <b>{edges.length}</b></span><span>Evidence <b>{contract.evidence.length}</b></span><span>Relations <b>{contract.relations.length}</b></span></section>
    <section className="grl-workspace"><div className="grl-canvas"><svg ref={svgRef} aria-label="GRL graph canvas" viewBox="0 0 1180 620" role="img">
      {nodeMode !== "relations" && stages.map((stage, index) => <g key={stage.id}><rect x={55 + index * (1050 / Math.max(stages.length - 1, 1))} y="45" width="90" height="520" rx="8" fill="#fff" fillOpacity=".7" stroke="#cbd5e1"/><text x={62 + index * (1050 / Math.max(stages.length - 1, 1))} y="30" fontSize="11" fill="#475569">{stage.label.slice(0, 15)}</text></g>)}
      <g fill="none">{edges.map((edge, index) => { const a = nodeById.get(edge.source), b = nodeById.get(edge.target); if (!a || !b) return null; const mid = (a.x + b.x) / 2; return <path key={edge.id} d={`M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`} stroke={edge.sourceKind === "relation" ? "#8b5cf6" : index % 2 ? "#10b981" : "#3b82f6"} strokeWidth={Math.min(4, .7 + edge.weight)} opacity={edge.source === activeId || edge.target === activeId ? .9 : .28}/>; })}</g>
      <g>{graph.nodes.map((node) => { const isActive = node.id === activeId; const isMatch = !search || matching.has(node.id); return <g key={node.id} role="button" tabIndex={0} aria-label={`${node.label} node`} onClick={() => setSelected(node.id)} onKeyDown={(event) => { if (event.key === "Enter") setSelected(node.id); }} opacity={isMatch ? 1 : .15}><circle cx={node.x} cy={node.y} r={isActive ? 7 : 4} fill={isActive ? "#0f172a" : "#fff"} stroke="#334155" strokeWidth={isActive ? 2 : 1}/>{(isActive || nodeMode === "relations") && <text x={node.x + 10} y={node.y + 4} fontSize="11" fill="#0f172a">{node.label.slice(0, 42)}</text>}</g>; })}</g>
    </svg></div><aside className="grl-detail"><small>ACTIVE NODE</small><h2>{active?.label ?? "No node"}</h2><p>{active?.detail}</p><dl><dt>Stage</dt><dd>{active?.stage ?? "-"}</dd><dt>Confidence</dt><dd>{Math.round((active?.confidence ?? 0) * 100)}%</dd><dt>Evidence density</dt><dd>{active?.density ?? 0}</dd><dt>Connected edges</dt><dd>{edges.filter((edge) => edge.source === activeId || edge.target === activeId).length}</dd></dl></aside></section>
  </main>;
}
