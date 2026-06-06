import type { EvidenceExtraction, EvidenceField, EvidenceRecord } from "@/mocks/evidence";
import type { WorkflowMock } from "@/mocks/workflow";
import { getImage } from "./image-store";
import type {
  ExtractedFact,
  IngestionStatus,
  WorkflowGraph,
} from "./types";

const JP_SEP = "、";

/**
 * Map a backend ExtractedFact to the existing EvidenceRecord UI type.
 * Literal mapping only — no derivation of line_items / unreadable_text /
 * missing-documentation signals. Lists are joined with the JP comma so we
 * don't stuff an array into a string slot.
 */
export function adaptFactToEvidence(
  fact: ExtractedFact,
  opts: { latencyMs?: number; capturedAtFallback?: string } = {},
): EvidenceRecord {
  const id = fact.id || `EV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const fields: EvidenceField[] = [
    { key: "document_type", value: fact.document_type },
  ];
  if (fact.date) fields.push({ key: "date", value: fact.date });
  if (fact.amount) fields.push({ key: "amount", value: fact.amount });
  if (fact.actors.length > 0)
    fields.push({ key: "actors", value: fact.actors.join(JP_SEP) });
  if (fact.counterparties.length > 0)
    fields.push({ key: "counterparties", value: fact.counterparties.join(JP_SEP) });
  if (fact.actions) fields.push({ key: "business_action", value: fact.actions });
  if (fact.summary_jp) fields.push({ key: "summary_jp", value: fact.summary_jp });

  const extraction: EvidenceExtraction = {
    document_type: fact.document_type,
    language: "ja",
    fields,
    line_items: [], // never fabricated
    unreadable_text: [], // never fabricated
  };

  const image = getImage(id) ?? "";

  const captured =
    fact.captured_at ?? opts.capturedAtFallback ?? new Date().toISOString();

  return {
    id,
    title: titleFromFact(fact),
    image,
    capturedAt: captured,
    source: "manual",
    extraction,
    telemetry: {
      backend: "mtmd_cli",
      model: "LFM2.5-VL Extract",
      mode: "local",
      n_gpu_layers: 0,
      latency_sec:
        opts.latencyMs !== undefined
          ? (opts.latencyMs / 1000).toFixed(2)
          : "sample",
      tokens_per_sec: "sample",
      rss_mb: "sample",
    },
  };
}

function titleFromFact(fact: ExtractedFact): string {
  if (fact.summary_jp) return fact.summary_jp.slice(0, 80);
  const cp = fact.counterparties[0];
  return cp ? `${fact.document_type} · ${cp}` : fact.document_type;
}

/**
 * Map a backend WorkflowGraph to the existing WorkflowMock UI type.
 * Does NOT derive missing_documentation_signals from requires_human_review.
 */
export function adaptGraphToWorkflow(
  graph: WorkflowGraph,
  factCount: number,
  target: string,
): WorkflowMock & {
  requires_review_node_ids: string[];
  workflow_observations_jp: string;
  workflow_observations_en: string;
} {
  const counts = new Map<string, number>();
  for (const sig of graph.observed_manual_or_paper_signals) {
    counts.set(sig, (counts.get(sig) ?? 0) + 1);
  }

  return {
    target,
    record_count: factCount,
    document_types_observed: [], // backend doesn't emit this aggregate
    repeated_manual_paper_signals: Array.from(counts.entries()).map(
      ([signal, count]) => ({ signal, count }),
    ),
    missing_documentation_signals: [], // never derived; hidden if empty
    workflow_nodes: graph.nodes.map((n) => ({
      id: n.id,
      label: n.label_en || n.label_jp,
      sub: n.label_jp,
      evidenceIds: n.source_fact_ids,
      manualPaperSignals: n.observed_signals,
    })),
    workflow_edges: graph.edges.map((e) => ({
      from: e.source,
      to: e.target,
      label: e.label ?? undefined,
    })),
    requires_review_node_ids: graph.nodes
      .filter((n) => n.requires_human_review)
      .map((n) => n.id),
    workflow_observations_jp: graph.workflow_observations_jp,
    workflow_observations_en: graph.workflow_observations_en,
  };
}

/** No PROCESSING → CAPTURE_READY lie. Returns the real backend status. */
export type LiveTriggerState = IngestionStatus;

export function adaptIngestionState(status: IngestionStatus): LiveTriggerState {
  return status;
}