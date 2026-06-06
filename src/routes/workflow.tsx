import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { workflowMock } from "@/mocks/workflow";
import { getEvidenceById } from "@/mocks/evidence";
import { StageBoundaryBanner } from "@/components/stage-banner";
import { TelemetryStrip } from "@/components/telemetry-strip";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workflow")({
  head: () => ({
    meta: [
      { title: "RollupOS — Workflow" },
      { name: "description", content: "Stage 2 aggregation: observed workflow graph reconstructed from Stage 1 records." },
    ],
  }),
  component: WorkflowPage,
});

function WorkflowPage() {
  const w = workflowMock;
  const [activeId, setActiveId] = useState<string>(w.workflow_nodes[0].id);
  const active = w.workflow_nodes.find((n) => n.id === activeId)!;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-hidden flex">
        {/* Graph column */}
        <div className="flex-1 min-w-0 overflow-y-auto p-12 border-r border-white/5">
          <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">
            Stage 2 · Workflow reconstruction
          </div>
          <h1 className="font-display text-4xl font-medium tracking-tight mb-2">
            Observed workflow
          </h1>
          <p className="text-sm text-white/50 max-w-[60ch] leading-relaxed">
            Aggregated from {w.record_count} Stage 1 records. Each node is grounded in the evidence
            ids it cites — nothing here is inferred beyond what was extracted.
          </p>

          {/* graph */}
          <div className="mt-12 relative">
            <div className="flex flex-col gap-3">
              {w.workflow_nodes.map((n, idx) => {
                const isActive = n.id === activeId;
                return (
                  <div key={n.id} className="flex items-stretch gap-4">
                    <div className="w-10 flex flex-col items-center pt-4">
                      <div className="text-[10px] font-mono text-white/30">
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      {idx < w.workflow_nodes.length - 1 && (
                        <div className="w-px flex-1 bg-white/10 mt-2" />
                      )}
                    </div>
                    <button
                      onClick={() => setActiveId(n.id)}
                      className={cn(
                        "flex-1 text-left border p-5 transition-colors cursor-pointer group",
                        isActive
                          ? "border-brand-orange/60 bg-brand-orange/5"
                          : "border-white/10 bg-panel hover:border-white/25",
                      )}
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div>
                          <div className="font-display text-xl font-medium">{n.label}</div>
                          <div className="text-xs text-white/40 mt-1">{n.sub}</div>
                        </div>
                        <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest whitespace-nowrap">
                          {n.evidenceIds.length} record
                          {n.evidenceIds.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {n.manualPaperSignals.map((s) => (
                          <span
                            key={s}
                            className="text-[10px] font-mono px-1.5 py-0.5 border border-brand-amber/30 text-brand-amber/80 uppercase tracking-wider"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-16 text-[11px] font-mono text-brand-teal/70 uppercase tracking-widest border-t border-brand-teal/10 pt-6">
            Stage 2 aggregates extracted records. It does not invent recommendations.
          </p>
        </div>

        {/* Side panel */}
        <aside className="w-[400px] flex-shrink-0 overflow-y-auto p-8 bg-background">
          <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">
            Aggregation
          </div>
          <h2 className="font-display text-2xl font-medium mb-1">{w.target}</h2>
          <div className="text-xs text-white/40 mb-8 font-mono">
            {w.record_count} records aggregated
          </div>

          <section className="mb-8">
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">
              Document types observed
            </div>
            <ul className="text-xs">
              {w.document_types_observed.map((d) => (
                <li
                  key={d.type}
                  className="flex justify-between border-b border-white/5 py-2 font-mono"
                >
                  <span className="text-white/70">{d.type}</span>
                  <span className="text-white/40">×{d.count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-8">
            <div className="text-[10px] font-mono text-brand-amber uppercase tracking-widest mb-3">
              Repeated manual / paper signals
            </div>
            <ul className="text-xs">
              {w.repeated_manual_paper_signals.map((s) => (
                <li
                  key={s.signal}
                  className="flex justify-between border-b border-white/5 py-2"
                >
                  <span className="text-white/70">{s.signal}</span>
                  <span className="font-mono text-brand-amber">×{s.count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-8">
            <div className="text-[10px] font-mono text-brand-amber uppercase tracking-widest mb-3">
              Missing documentation signals
            </div>
            <ul className="text-xs space-y-2">
              {w.missing_documentation_signals.map((m) => (
                <li key={m} className="text-white/60 leading-relaxed pl-3 border-l border-brand-amber/40">
                  {m}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="text-[10px] font-mono text-brand-teal uppercase tracking-widest mb-3">
              {active.label} · contributing evidence
            </div>
            <ul className="space-y-2">
              {active.evidenceIds.map((eid) => {
                const e = getEvidenceById(eid);
                if (!e) return null;
                return (
                  <li key={eid}>
                    <Link
                      to="/evidence/$id"
                      params={{ id: eid }}
                      className="flex items-center justify-between border border-white/10 px-3 py-2 text-xs hover:border-brand-teal/50 hover:bg-brand-teal/5 transition-colors"
                    >
                      <span className="font-mono text-white/70">{eid}</span>
                      <span className="text-white/40 truncate ml-3">{e.extraction.document_type}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
      <StageBoundaryBanner />
      <TelemetryStrip />
    </div>
  );
}