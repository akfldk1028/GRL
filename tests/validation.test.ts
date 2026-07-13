import { describe, expect, test } from "vitest";
import example from "../examples/grl-example.json";
import { GRLValidationError, filterGraphEdges, fromWikiHarness, projectGraph, queryGraph, validateContract } from "../src";

describe("GRL contract", () => {
  test("validates the portable example", () => {
    const contract = validateContract(example);
    expect(contract.schemaVersion).toBe("grl/v1");
    expect(contract.features).toHaveLength(4);
  });
  test("rejects missing endpoints", () => {
    const invalid = structuredClone(example);
    invalid.circuits[0].targetFeatureId = "feature:missing";
    expect(() => validateContract(invalid)).toThrow(GRLValidationError);
  });
  test("converts a WikiHarness snapshot", () => {
    const converted = fromWikiHarness({ fixture: "wiki", book: { id: "book:wiki", title: "Wiki" }, features: example.features, featureEvidence: example.evidence.map((item) => ({ ...item, pageId: "page:one" })), circuits: example.circuits, relations: example.relations });
    expect(converted.dataset.id).toBe("book:wiki");
    expect(converted.evidence[0].pageId).toBe("page:one");
  });
  test("projects and queries graph logic without React", () => {
    const contract = validateContract(example);
    const featureGraph = projectGraph(contract, "features");
    expect(featureGraph.nodes).toHaveLength(4);
    expect(filterGraphEdges(featureGraph.edges, { mode: "evidence_dense" })).toHaveLength(2);
    expect(filterGraphEdges(featureGraph.edges, { firstDegreeOf: "feature:claim" })).toHaveLength(2);
    const query = queryGraph(contract, "feature:claim");
    expect(query?.neighbors.map((item) => item.id).sort()).toEqual(["feature:model", "feature:url"]);
    expect(query?.evidence.map((item) => item.id)).toContain("evidence:claim");
    expect(projectGraph(contract, "relations").nodes).toHaveLength(2);
  });
});
