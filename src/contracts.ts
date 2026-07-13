export const GRL_SCHEMA_VERSION = "grl/v1" as const;

export type GRLStage = { id: string; label: string; description?: string };
export type GRLFeature = {
  id: string; label: string; kind: string; confidence: number; pipelineStage: string;
  evidenceDensity: number; queryHints?: string[]; metadata?: Record<string, string>;
};
export type GRLEvidence = {
  id: string; featureId: string; sourcePath: string; excerpt: string;
  evidenceType: string; confidence: number; pageId?: string;
};
export type GRLCircuit = {
  id: string; sourceFeatureId: string; targetFeatureId: string; type: string;
  confidence: number; evidenceDensity: number; edgeWeight: number; evidenceIds?: string[];
};
export type GRLRelation = {
  id: string; sourceNodeId: string; targetNodeId: string; type: string;
  confidence: number; evidenceIds?: string[]; metadata?: Record<string, string>;
};
export type GRLContract = {
  schemaVersion: typeof GRL_SCHEMA_VERSION;
  dataset: { id: string; title: string; source?: string; description?: string };
  stages?: GRLStage[];
  features: GRLFeature[];
  evidence: GRLEvidence[];
  circuits: GRLCircuit[];
  relations: GRLRelation[];
  queryHints?: string[];
};
