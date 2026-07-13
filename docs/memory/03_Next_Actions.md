# GRL Next Actions

1. Publish `grl@1.0.0` after adding the repository `NPM_TOKEN` secret.
2. Move Agent-Native WikiDocs from its in-repo graph-lab copy to the released package.
3. Add adapters only when another producer supplies a stable contract; keep producer logic outside GRL.
4. Version breaking wire changes under a new schema version and retain v1 validation fixtures.
