export function StageBoundaryBanner() {
  return (
    <div className="h-10 bg-brand-teal/5 border-y border-brand-teal/10 flex items-center px-8 gap-3">
      <div className="size-1.5 rounded-full bg-brand-teal" />
      <p className="text-[11px] uppercase tracking-widest text-brand-teal/80 font-medium">
        Stage 1 = visible facts only. No bottleneck/ROI inference here.
      </p>
    </div>
  );
}