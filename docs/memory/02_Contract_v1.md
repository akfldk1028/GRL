# GRL Contract v1

`schemaVersion` must equal `grl/v1`. A dataset contains features, evidence, circuits, and relations. Features carry `pipelineStage`, `confidence`, and `evidenceDensity`; circuits carry `edgeWeight`, `evidenceDensity`, and optional evidence IDs. Stages and query hints are optional.

Validation rejects duplicate IDs, out-of-range confidence, negative density/weight, missing circuit feature endpoints, missing evidence feature endpoints, and missing circuit evidence references. See `schema/grl-v1.schema.json` and `examples/grl-example.json` for the wire format.
