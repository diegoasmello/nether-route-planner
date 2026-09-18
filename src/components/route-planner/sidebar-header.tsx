export function SidebarHeader() {
  return (
    <header className="flex shrink-0 flex-col gap-1.5 border-b border-panel-border px-4.5 py-4">
      <div className="flex items-center gap-2.5">
        <span className="block h-2.75 w-2.75 shrink-0 bg-accent shadow-[0_0_12px_var(--color-accent)]" />
        <h1 className="text-[15px] font-bold uppercase tracking-[0.14em] text-heading">
          Nether Hub Route Planner
        </h1>
      </div>
      <p className="font-mono-ui text-[11.5px] leading-relaxed text-muted">
        Planejamento de túneis bloco a bloco
      </p>
    </header>
  );
}
