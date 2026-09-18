export function CanvasCompass() {
  return (
    <div className="pointer-events-none absolute right-4.5 top-4 flex h-14 w-14 flex-col items-center justify-center rounded-full border border-border bg-canvas-overlay">
      <span className="text-[11px] leading-none text-orange">▲</span>
      <span className="font-mono-ui text-[13px] font-bold tracking-wider text-heading">
        N
      </span>
    </div>
  );
}
