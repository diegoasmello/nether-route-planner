import { COLORS } from "./route-canvas";

// Swatch colors mirror whatever RouteCanvas currently draws with (the
// prototype's own legend colors don't match this app's canvas palette).
const ITEMS = [
  { color: COLORS.hubStroke, label: "anel do hub" },
  { color: COLORS.portalSlot, label: "slot de portal" },
  { color: COLORS.centerlineStroke, label: "caminho selecionado" },
  { color: COLORS.otherAccent, label: "outros visíveis" },
] as const;

export function CanvasLegend() {
  return (
    <div className="pointer-events-none absolute bottom-4.5 left-4.5 right-18.5 flex max-w-max flex-wrap items-center gap-3.5 rounded-[3px] border border-panel-border bg-canvas-overlay px-3 py-2.25 font-mono-ui text-[10.5px] text-secondary">
      {ITEMS.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="block h-2.25 w-2.25"
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
      <span>arraste = pan · roda = zoom</span>
    </div>
  );
}
