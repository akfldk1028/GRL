# GRL

GRL is a portable, agent-readable graph explorer for feature, evidence, circuit, and relation contracts. It provides a standalone local-first app, a reusable React component, and a validation/conversion CLI.

Derived from the Graph Lab experiment in [Agent-Native WikiDocs](https://github.com/akfldk1028/agent-native-wikidocs), through source commit `3141d0c`.

## Use

```bash
npm install grl
```

```tsx
import { GraphLab, validateContract } from "grl";
import "grl/styles.css";

<GraphLab contract={validateContract(data)} />
```

The graph engine is UI-independent:

```ts
import { projectGraph, filterGraphEdges, queryGraph } from "grl";

const graph = projectGraph(contract, "features");
const dense = filterGraphEdges(graph.edges, { mode: "evidence_dense" });
const neighborhood = queryGraph(contract, "feature:claim");
```

```bash
grl validate contract.json
grl inspect contract.json --node feature:claim
grl convert wikiharness snapshot.json --out grl.json
grl serve contract.json --port 5190
```

The app accepts local JSON files, pasted GRL/WikiHarness JSON, and CORS-enabled URLs. Source data stays in the browser. It supports feature, evidence, and stage modes; circuit/relation/dense filters; search; confidence and first-degree filtering; and transparent PNG/SVG capture.

Contract version `grl/v1` is documented in [`schema/grl-v1.schema.json`](schema/grl-v1.schema.json). Run `npm run verify` before committing.

For clone-and-resume context, read [`docs/memory/00_Current_State.md`](docs/memory/00_Current_State.md), then Architecture, Contract v1, and Next Actions in the same directory.
