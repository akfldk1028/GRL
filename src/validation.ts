import { z } from "zod";
import type { GRLContract } from "./contracts";

const id = z.string().min(1);
const score = z.number().min(0).max(1);
export const grlContractSchema = z.object({
  schemaVersion: z.literal("grl/v1"),
  dataset: z.object({ id, title: id, source: z.string().optional(), description: z.string().optional() }),
  stages: z.array(z.object({ id, label: id, description: z.string().optional() })).optional(),
  features: z.array(z.object({
    id, label: id, kind: id, confidence: score, pipelineStage: id,
    evidenceDensity: z.number().nonnegative(), queryHints: z.array(z.string()).optional(),
    metadata: z.record(z.string()).optional(),
  })),
  evidence: z.array(z.object({
    id, featureId: id, sourcePath: z.string(), excerpt: z.string(), evidenceType: id,
    confidence: score, pageId: z.string().optional(),
  })),
  circuits: z.array(z.object({
    id, sourceFeatureId: id, targetFeatureId: id, type: id, confidence: score,
    evidenceDensity: z.number().nonnegative(), edgeWeight: z.number().nonnegative(),
    evidenceIds: z.array(z.string()).optional(),
  })),
  relations: z.array(z.object({
    id, sourceNodeId: id, targetNodeId: id, type: id, confidence: score,
    evidenceIds: z.array(z.string()).optional(), metadata: z.record(z.string()).optional(),
  })),
  queryHints: z.array(z.string()).optional(),
});

export class GRLValidationError extends Error {
  constructor(public readonly issues: string[]) { super(`Invalid GRL contract:\n${issues.join("\n")}`); }
}

export function validateContract(input: unknown): GRLContract {
  const parsed = grlContractSchema.safeParse(input);
  if (!parsed.success) throw new GRLValidationError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
  const contract = parsed.data as GRLContract;
  const ids = new Set<string>();
  const duplicates: string[] = [];
  for (const item of [...contract.features, ...contract.evidence, ...contract.circuits, ...contract.relations]) {
    if (ids.has(item.id)) duplicates.push(item.id); else ids.add(item.id);
  }
  const featureIds = new Set(contract.features.map((item) => item.id));
  const evidenceIds = new Set(contract.evidence.map((item) => item.id));
  const semantic = [
    ...duplicates.map((item) => `duplicate id: ${item}`),
    ...contract.evidence.filter((item) => !featureIds.has(item.featureId)).map((item) => `evidence ${item.id} references missing feature ${item.featureId}`),
    ...contract.circuits.flatMap((item) => [item.sourceFeatureId, item.targetFeatureId].filter((value) => !featureIds.has(value)).map((value) => `circuit ${item.id} references missing feature ${value}`)),
    ...contract.circuits.flatMap((item) => (item.evidenceIds ?? []).filter((value) => !evidenceIds.has(value)).map((value) => `circuit ${item.id} references missing evidence ${value}`)),
  ];
  if (semantic.length) throw new GRLValidationError(semantic);
  return contract;
}
