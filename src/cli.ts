#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fromWikiHarness } from "./wiki-harness";
import { queryGraph, type GRLNodeMode } from "./graph";
import { validateContract } from "./validation";

async function json(path: string) { return JSON.parse(await readFile(resolve(path), "utf8")); }
async function main() {
  const [command, path, ...rest] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help") { console.log("grl validate <file> | inspect <file> --node <id> [--mode features|evidence|relations|stages] | convert wikiharness <input> --out <file> | serve <file> --port 5190"); return; }
  if (command === "validate") { const data = validateContract(await json(path)); console.log(`OK ${data.dataset.id}: ${data.features.length} features, ${data.evidence.length} evidence, ${data.circuits.length} circuits, ${data.relations.length} relations`); return; }
  if (command === "inspect") {
    const data = validateContract(await json(path)); const nodeId = rest[rest.indexOf("--node") + 1]; const modeIndex = rest.indexOf("--mode"); const mode = (modeIndex >= 0 ? rest[modeIndex + 1] : "features") as GRLNodeMode;
    const result = queryGraph(data, nodeId, mode); if (!result) throw new Error(`node not found in ${mode} graph: ${nodeId}`);
    console.log(JSON.stringify(result, null, 2)); return;
  }
  if (command === "convert" && path === "wikiharness") {
    const input = rest[0]; const output = rest[rest.indexOf("--out") + 1]; if (!input || !output) throw new Error("convert requires input and --out");
    const { writeFile } = await import("node:fs/promises"); await writeFile(resolve(output), JSON.stringify(fromWikiHarness(await json(input)), null, 2) + "\n"); console.log(`WROTE ${resolve(output)}`); return;
  }
  if (command === "serve") {
    const contract = validateContract(await json(path)); const portIndex = rest.indexOf("--port"); const port = Number(portIndex >= 0 ? rest[portIndex + 1] : 5190); const appRoot = resolve(fileURLToPath(new URL("../dist-app", import.meta.url)));
    createServer(async (request, response) => { try {
      if (request.url === "/contract.json") { response.setHeader("content-type", "application/json"); response.end(JSON.stringify(contract)); return; }
      const pathname = request.url === "/" ? "/index.html" : (request.url ?? "/index.html").split("?", 1)[0]; const target = join(appRoot, pathname); const mime: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
      response.setHeader("content-type", mime[extname(target)] ?? "application/octet-stream"); response.end(await readFile(target));
    } catch { response.statusCode = 404; response.end("Not found"); } }).listen(port, "127.0.0.1", () => console.log(`GRL http://127.0.0.1:${port}`)); return;
  }
  throw new Error(`unknown command: ${command}`);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
