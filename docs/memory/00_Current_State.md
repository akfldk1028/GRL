# GRL Current State

GRL is a public, reusable graph explorer extracted from Agent-Native WikiDocs. Version 1 accepts `grl/v1` JSON and exposes the same capability through a standalone local-first web app, the `grl` React package, and the `grl` CLI.

Current baseline: feature/evidence/relation/stage node modes, circuit/relation/dense filters, search, confidence and first-degree controls, node inspection, WikiHarness conversion, schema validation, and transparent PNG/SVG capture.

Verification baseline: `npm run verify`. Generated output, screenshots, tarballs, and dependencies are never committed.

Graph semantics are UI-independent in `src/graph.ts`: stage derivation, feature/evidence/relation/stage projection, circuit and relation edge projection, density/confidence/first-degree filtering, and neighborhood/evidence queries. React and CLI call this same core.
