# AGENTS.md

GRL is a reusable viewer for versioned feature/evidence/circuit/relation contracts.

For every meaningful change: inspect first, make the smallest coherent edit, run `npm run verify`, review the diff, update GRL Obsidian memory, commit intentionally, and push only after checking the remote. Do not commit `node_modules`, `dist`, `dist-app`, Playwright output, tarballs, or screenshots.

Keep WikiDocs-specific producers in WikiDocs. GRL may provide adapters but its core contract and UI must not import WikiDocs source files or generated snapshots.
