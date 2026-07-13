import type { GRLContract } from "./contracts";
import { validateContract } from "./validation";

type RecordList = Array<Record<string, unknown>>;
export function fromWikiHarness(snapshot: Record<string, unknown>): GRLContract {
  const book = (snapshot.book ?? {}) as Record<string, unknown>;
  const features = (snapshot.features ?? []) as RecordList;
  const featureEvidence = (snapshot.featureEvidence ?? snapshot["feature-evidence"] ?? []) as RecordList;
  const circuits = (snapshot.circuits ?? []) as RecordList;
  const relations = (snapshot.relations ?? []) as RecordList;
  return validateContract({
    schemaVersion: "grl/v1",
    dataset: {
      id: String(book.id ?? snapshot.fixture ?? "wiki-harness"),
      title: String(book.title ?? snapshot.fixture ?? "WikiHarness dataset"),
      source: String(book.source ?? ""), description: String(book.description ?? ""),
    },
    features: features.map((item) => ({
      id: String(item.id), label: String(item.label), kind: String(item.kind ?? "feature"),
      confidence: Number(item.confidence ?? 0), pipelineStage: String(item.pipelineStage ?? "unassigned"),
      evidenceDensity: Number(item.evidenceDensity ?? 0), queryHints: item.queryHints ?? [],
    })),
    evidence: featureEvidence.map((item) => ({
      id: String(item.id), featureId: String(item.featureId), pageId: item.pageId ? String(item.pageId) : undefined,
      sourcePath: String(item.sourcePath ?? ""), excerpt: String(item.excerpt ?? ""),
      evidenceType: String(item.evidenceType ?? "source"), confidence: Number(item.confidence ?? 0),
    })),
    circuits: circuits.map((item) => ({
      id: String(item.id), sourceFeatureId: String(item.sourceFeatureId), targetFeatureId: String(item.targetFeatureId),
      type: String(item.type ?? "related"), confidence: Number(item.confidence ?? 0),
      evidenceDensity: Number(item.evidenceDensity ?? 0), edgeWeight: Number(item.edgeWeight ?? 0),
      evidenceIds: item.evidenceIds ?? [],
    })),
    relations: relations.map((item) => ({
        id: String(item.id), sourceNodeId: String(item.sourceNodeId), targetNodeId: String(item.targetNodeId),
        type: String(item.type ?? "related"), confidence: Number(item.confidence ?? 0),
        metadata: Object.fromEntries(Object.entries((item.metadata ?? {}) as Record<string, unknown>).map(([key, value]) => [key, String(value)])),
      })),
    queryHints: [],
  });
}
