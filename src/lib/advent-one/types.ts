// Backend TS mirrors of src/advent_one/schemas.py

export type BackendDocumentType =
  | "receipt"
  | "invoice"
  | "fax"
  | "whiteboard"
  | "sticky_note"
  | "memo"
  | "delivery_slip"
  | "form"
  | "other";

export type ExtractedFact = {
  id?: string | null;
  document_type: BackendDocumentType;
  actors: string[];
  actions: string;
  date: string | null;
  amount: string | null;
  counterparties: string[];
  summary_jp: string;
  captured_at?: string | null;
};

export type WorkflowNode = {
  id: string;
  label_jp: string;
  label_en: string;
  role?: string | null;
  node_type: "start" | "step" | "decision" | "external" | "end";
  observed_signals: string[];
  source_fact_ids: string[];
  requires_human_review: boolean;
};

export type WorkflowEdge = {
  source: string;
  target: string;
  label?: string | null;
};

export type WorkflowGraph = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  observed_manual_or_paper_signals: string[];
  approval_reference_count: number;
  owner_or_president_mentions: number;
  workflow_observations_jp: string;
  workflow_observations_en: string;
};

export type IngestionStatus = "SLEEP" | "AWAKE" | "PROCESSING" | "READY";

export type IngestionState = {
  status: IngestionStatus;
  last_trigger_at: string | null;
  captured_count: number;
};

export type HealthResponse = {
  status: string;
  vl_server: boolean;
  jp_server: boolean;
  ingestion_status: IngestionStatus;
  captured_count: number;
};

export type ExtractResponse = {
  fact: ExtractedFact;
  latency_ms: number;
  weave_trace_url?: string;
};

export type SynthesizeResponse = {
  graph: WorkflowGraph;
  latency_ms: number;
  facts_synthesized: number;
  weave_trace_url?: string;
};

export type SchemaName = "sakura_logistics" | "government_letter";

export type AppDataSource = "mock" | "live" | "auto";
export type AppDataMode = "mock" | "live";
export type AppDataBadge = "mock" | "live" | "auto-live" | "auto-mock-fallback";