import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import type { GRLContract } from "../contracts";
import { filterGraphEdges, projectGraph, type GRLEdgeMode, type GRLNodeMode } from "../graph";
import { validateContract } from "../validation";

const GRLContext = createContext<GRLContract | null>(null);
export function GraphLabProvider({ contract, children }: { contract: GRLContract; children: React.ReactNode }) {
  return <GRLContext.Provider value={validateContract(contract)}>{children}</GRLContext.Provider>;
}
export function useGRLContract() {
  const value = useContext(GRLContext);
  if (!value) throw new Error("GraphLab must receive a contract or be wrapped in GraphLabProvider");
  return value;
}

export function GraphLab({ contract: directContract, title = "GRL" }: { contract?: GRLContract; title?: string }) {
  const context = useContext(GRLContext); const contract = useMemo(() => directContract ? validateContract(directContract) : context, [directContract, context]);
  if (!contract) throw new Error("GraphLab requires a contract");
  const [nodeMode, setNodeMode] = useState<GRLNodeMode>("features"); const [edgeMode, setEdgeMode] = useState<GRLEdgeMode>("all");
  const [selected, setSelected] = useState(""); const [search, setSearch] = useState(""); const [firstDegree, setFirstDegree] = useState(false);
  const [confidence, setConfidence] = useState(0); const svgRef = useRef<SVGSVGElement>(null);
  const graph = useMemo(() => projectGraph(contract, nodeMode), [contract, nodeMode]); const stages = graph.stages;
  const matching = new Set(graph.nodes.filter((node) => node.label.toLowerCase().includes(search.toLowerCase())).map((node) => node.id));
  const activeId = selected || graph.nodes[0]?.id || ""; const nodeById = new Map(graph.nodes.map((node) => [node.id, node])); const active = nodeById.get(activeId);
  const edges = filterGraphEdges(graph.edges, { mode: edgeMode, minimumConfidence: confidence, firstDegreeOf: firstDegree ? activeId : undefined });
  function serializedSvg() { if (!svgRef.current) throw new Error("Graph SVG unavailable"); return new XMLSerializer().serializeToString(svgRef.current); }
  function download(href: string, filename: string) { const link = document.createElement("a"); link.href = href; link.download = filename; document.body.append(link); link.click(); link.remove(); }
  function exportSvg() { const blob = new Blob([serializedSvg()], { type: "image/svg+xml" }); const url = URL.createObjectURL(blob); download(url, `grl-${nodeMode}-${edgeMode}.svg`); setTimeout(() => URL.revokeObjectURL(url)); }
  async function exportPng() { const blob = new Blob([serializedSvg()], { type: "image/svg+xml" }); const url = URL.createObjectURL(blob); const image = new Image(); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = url; }); const canvas = document.createElement("canvas"); canvas.width = 2360; canvas.height = 1240; const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas unavailable"); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); download(canvas.toDataURL("image/png"), `grl-${nodeMode}-${edgeMode}.png`); }
  return <main className="grl-shell">
    <header className="grl-header"><div><h1>{title}</h1><p>{contract.dataset.title} · feature/evidence/circuit/relation explorer</p></div><div className="grl-actions"><button onClick={() => void exportPng()}>Capture PNG</button><button onClick={exportSvg}>Capture SVG</button></div></header>
    <section className="grl-controls">
      <div className="grl-segment">{(["features", "evidence", "relations", "stages"] as GRLNodeMode[]).map((mode) => <button className={nodeMode === mode ? "active" : ""} key={mode} onClick={() => { setNodeMode(mode); setSelected(""); }}>{mode}</button>)}</div>
      <div className="grl-segment">{(["all", "circuits", "relations", "evidence_dense"] as GRLEdgeMode[]).map((mode) => <button aria-label={`Filter ${mode}`} className={edgeMode === mode ? "active" : ""} key={mode} onClick={() => setEdgeMode(mode)}>{mode}</button>)}</div>
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
