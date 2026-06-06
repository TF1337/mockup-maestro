import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { evidenceRecords } from "@/mocks/evidence";
import { triggerTransitions, type TriggerState } from "@/mocks/hardware";
import { JsonViewer } from "@/components/json-viewer";
import { DocumentViewer } from "@/components/document-viewer";
import { StageBoundaryBanner } from "@/components/stage-banner";
import { TelemetryStrip } from "@/components/telemetry-strip";

export const Route = createFileRoute("/capture")({
  head: () => ({
    meta: [
      { title: "RollupOS — Capture & Extract" },
      { name: "description", content: "Manual upload or hardware trigger. Run Stage 1 grounded extraction on a single image." },
    ],
  }),
  component: CapturePage,
});

function CapturePage() {
  const navigate = useNavigate();
  const sample = evidenceRecords[0];
  const [triggerState, setTriggerState] = useState<TriggerState>("SLEEP");
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  const runExtraction = () => {
    setRunning(true);
    setCompleted(false);
    window.setTimeout(() => {
      setRunning(false);
      setCompleted(true);
    }, lines() * 60 + 400);
  };

  // approximate JSON viewer line count for timing
  function lines() {
    return (
      5 +
      sample.extraction.fields.length +
      sample.extraction.line_items.length +
      sample.extraction.unreadable_text.length
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-12 py-12">
          <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">
            Stage 1 · Capture
          </div>
          <h1 className="font-display text-4xl font-medium tracking-tight mb-2">Capture &amp; extract</h1>
          <p className="text-sm text-white/50 max-w-[60ch] leading-relaxed">
            One image in, strict schema-bound JSON out. The hardware trigger is an optional sensor
            layer — capture always falls back to manual upload.
          </p>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Manual upload */}
            <div className="border border-white/10 bg-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">Manual upload</h2>
                <span className="text-[10px] font-mono text-brand-teal uppercase tracking-wider">
                  always available
                </span>
              </div>
              <div className="border border-dashed border-white/15 h-44 flex flex-col items-center justify-center text-center px-6">
                <div className="text-sm text-white/60">Drag-drop or click to select</div>
                <div className="text-[10px] font-mono text-white/30 mt-2 uppercase tracking-widest">
                  JPG · PNG · HEIC (mock)
                </div>
              </div>
              <div className="mt-4 text-xs text-white/40">
                Currently loaded: <span className="text-white/70 font-mono">{sample.id} · {sample.extraction.document_type}</span>
              </div>
            </div>

            {/* Hardware trigger */}
            <div className="border border-white/10 bg-panel p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">ESP32 / PIR trigger</h2>
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  optional · trigger layer
                </span>
              </div>
              <p className="text-xs text-white/40 mb-4 leading-relaxed">
                Updates hardware state only. Does <span className="text-brand-amber">not</span> run
                inference — capture still flows through the extract pipeline below.
              </p>
              <div className="grid grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-wider mb-4">
                {(["SLEEP", "AWAKE", "CAPTURE_READY"] as TriggerState[]).map((s) => (
                  <div
                    key={s}
                    className={cn(
                      "py-2 text-center border",
                      s === triggerState
                        ? "border-brand-teal text-brand-teal bg-brand-teal/5"
                        : "border-white/10 text-white/30",
                    )}
                  >
                    {s}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setTriggerState((s) => triggerTransitions[s])}
                className="mt-auto border border-white/15 text-white/80 px-4 py-2 text-xs hover:border-white/30 hover:text-white transition-colors cursor-pointer"
              >
                Trigger sensor event →
              </button>
            </div>
          </div>

          {/* Extraction panel */}
          <div className="mt-8 border border-white/10 bg-panel">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h2 className="text-sm font-medium">Extraction</h2>
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-1">
                  backend: mtmd_cli · model: LFM2.5-VL Extract
                </p>
              </div>
              <div className="flex items-center gap-3">
                {completed && (
                  <button
                    onClick={() => navigate({ to: "/evidence/$id", params: { id: sample.id } })}
                    className="text-xs font-mono text-brand-teal uppercase tracking-wider hover:underline cursor-pointer"
                  >
                    View record →
                  </button>
                )}
                <button
                  onClick={runExtraction}
                  disabled={running}
                  className="bg-brand-orange text-background px-4 py-2 text-xs font-medium hover:bg-brand-orange/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {running ? "Extracting…" : completed ? "Re-run extraction" : "Run extraction"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[520px]">
              <div className="p-6 border-r border-white/10">
                <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">
                  Source image
                </div>
                <DocumentViewer
                  image={sample.image}
                  unreadable={completed || running ? sample.extraction.unreadable_text : []}
                />
              </div>
              <div className="min-h-[520px] flex flex-col">
                {running || completed ? (
                  <JsonViewer extraction={sample.extraction} animate={running} key={running ? "run" : "done"} />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs font-mono text-white/30 uppercase tracking-widest">
                    Awaiting extraction…
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <StageBoundaryBanner />
      <TelemetryStrip telemetry={sample.telemetry} />
    </div>
  );
}