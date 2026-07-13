import { describe, expect, test } from "vitest";
import example from "../examples/grl-example.json";
import { GRLValidationError, fromWikiHarness, validateContract } from "../src";

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
});
