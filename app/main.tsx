import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { GraphLab, fromWikiHarness, validateContract, type GRLContract } from "grl";
import "../src/react/styles.css";
import "./app.css";
import example from "../examples/grl-example.json";

function App() {
  const [contract, setContract] = useState<GRLContract>(() => validateContract(example)); const [error, setError] = useState(""); const [paste, setPaste] = useState("");
  useEffect(() => { if (import.meta.env.BASE_URL !== "/") return; const controller = new AbortController(); fetch("/contract.json", { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setContract(validateContract(data))).catch(() => undefined); return () => controller.abort(); }, []);
  function load(input: unknown) { try { setContract(validateContract(input)); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); } }
  async function loadUrl() { const url = window.prompt("CORS-enabled contract URL"); if (!url) return; try { load(await (await fetch(url)).json()); } catch (reason) { setError(`URL load failed: ${reason}`); } }
  return <><nav className="app-loader"><label>Open JSON<input aria-label="Open contract file" type="file" accept="application/json,.json" onChange={async (event) => { const file = event.target.files?.[0]; if (file) load(JSON.parse(await file.text())); }}/></label><button onClick={loadUrl}>Load URL</button><button onClick={() => { try { const data = JSON.parse(paste); load("features" in data && "circuits" in data && !data.schemaVersion ? fromWikiHarness(data) : data); } catch (reason) { setError(`JSON parse failed: ${reason}`); } }}>Load pasted JSON</button><textarea aria-label="Paste contract JSON" placeholder="Paste GRL or WikiHarness JSON" value={paste} onChange={(event) => setPaste(event.target.value)}/>{error && <pre role="alert">{error}</pre>}</nav><GraphLab contract={contract} title="GRL" /></>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
