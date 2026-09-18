import { rasterizeOrthogonalPath } from "@/lib/minecraft/line-rasterization";
import type { Point, RouteStyle } from "@/lib/minecraft/route";

interface RouteStyleToggleProps {
  value: RouteStyle;
  onChange: (value: RouteStyle) => void;
  invertAxisOrder: boolean;
  onInvertAxisOrderChange: (value: boolean) => void;
  /** Hub center and the draft's destination — used only to label which axis the first orthogonal leg travels. */
  origin: Point;
  destination: Point;
}

const OPTIONS: { value: RouteStyle; label: string; description: string }[] = [
  {
    value: "diagonal",
    label: "Diagonal",
    description: "Segue a linha ideal em escada de blocos — menor distância construída.",
  },
  {
    value: "orthogonal",
    label: "Ortogonal",
    description: 'Dois trechos retos em "L" — mais fácil de cavar, não segue a linha ideal.',
  },
];

// Mirrors `rasterizeOrthogonalPath`'s own dominant-axis rule (ties go to X)
// instead of re-deriving it, so the label can never drift from the math.
function firstLegAxisLabel(origin: Point, destination: Point, invertAxisOrder: boolean): string {
  const [firstLeg] = rasterizeOrthogonalPath(origin, destination, invertAxisOrder).legs;
  return firstLeg.direction.x === 0 && firstLeg.direction.z !== 0 ? "eixo Z" : "eixo X";
}

export function RouteStyleToggle({
  value,
  onChange,
  invertAxisOrder,
  onInvertAxisOrderChange,
  origin,
  destination,
}: RouteStyleToggleProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-secondary">Estilo da rota</span>
      <div className="grid grid-cols-2 gap-1.5">
        {OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              title={option.description}
              className={`rounded-[3px] border px-2 py-2.5 text-center text-xs font-semibold transition-colors ${
                selected
                  ? "border-toggle-on-border bg-toggle-on-bg text-primary-strong"
                  : "border-border-strong bg-input-alt text-secondary hover:text-primary"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10.5px] leading-relaxed text-muted">
        {OPTIONS.find((option) => option.value === value)?.description}
      </p>
      {value === "orthogonal" ? (
        <button
          type="button"
          onClick={() => onInvertAxisOrderChange(!invertAxisOrder)}
          className="flex items-center justify-between gap-2 rounded-[3px] border border-border-strong bg-input-alt px-2.5 py-2 text-left text-xs text-accent-strong transition-colors hover:border-accent"
        >
          <span>Primeiro trecho: {firstLegAxisLabel(origin, destination, invertAxisOrder)}</span>
          <span className="font-mono-ui tracking-wider text-accent">inverter ⇄</span>
        </button>
      ) : null}
    </div>
  );
}
