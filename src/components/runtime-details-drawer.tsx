import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { runtimeDetails } from "@/mocks/hardware";

const ROWS: { label: string; key: keyof typeof runtimeDetails; mono?: boolean }[] = [
  { label: "backend", key: "backend", mono: true },
  { label: "cli_path", key: "cli_path", mono: true },
  { label: "model_path", key: "model_path", mono: true },
  { label: "mmproj_path", key: "mmproj_path", mono: true },
  { label: "grammar_file", key: "grammar_file", mono: true },
  { label: "schema_file", key: "schema_file", mono: true },
  { label: "manual_fallback", key: "manual_fallback" },
];

export function RuntimeDetailsDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:max-w-none bg-background border-white/10 text-foreground">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl text-foreground">Runtime Details</SheetTitle>
          <SheetDescription className="text-white/40 text-xs font-mono uppercase tracking-widest">
            mock — not wired to a live appliance
          </SheetDescription>
        </SheetHeader>
        <div className="mt-8 divide-y divide-white/5 border-t border-b border-white/5">
          {ROWS.map((row) => {
            const value = runtimeDetails[row.key];
            return (
              <div key={row.key} className="grid grid-cols-[140px_1fr] gap-4 py-3 text-xs">
                <div className="text-white/30 font-mono uppercase tracking-wider">{row.label}</div>
                <div
                  className={
                    row.mono
                      ? "font-mono text-white/80 break-all"
                      : "text-white/80"
                  }
                >
                  {String(value)}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-[11px] text-white/30 leading-relaxed">
          Stage 1 is the validated <span className="font-mono text-brand-teal">llama-mtmd-cli</span>{" "}
          flow with Liquid LFM2.5-VL Extract GGUF, matching <span className="font-mono">mmproj</span>{" "}
          and a grammar file for deterministic structured JSON.
        </p>
      </SheetContent>
    </Sheet>
  );
}