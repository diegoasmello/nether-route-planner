import type { RoutePlanResult } from "@/lib/minecraft/route";

export interface RouteSummaryTarget {
  readonly title: string;
  readonly result: RoutePlanResult;
}

interface RouteSummaryProps {
  /** The selected path's plan, or the in-progress draft's live preview while editing. */
  target: RouteSummaryTarget | null;
  /** True while `target` reflects an unsaved draft rather than a saved, selected path. */
  previewing: boolean;
}

// Trims float noise from arithmetic on whole-block coordinates without
// hiding genuinely fractional values (there are none today, but nothing
// forces coordinates to stay integers either).
function fmt(n: number): string {
  return Math.abs(n - Math.round(n)) < 0.005
    ? String(Math.round(n))
    : n.toFixed(2);
}

function StatCell({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 bg-input px-2.5 py-2">
      <span className="text-[9.5px] uppercase tracking-wider text-faint">
        {label}
      </span>
      <span
        className={`font-mono-ui text-sm text-heading ${valueClassName ?? ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export function RouteSummary({ target, previewing }: RouteSummaryProps) {
  if (!target) {
    return (
      <p className="rounded-sm border border-dashed border-border p-3.5 font-mono-ui text-[11.5px] leading-relaxed text-muted">
        Selecione um caminho na lista para ver ΔX/ΔZ, distância, ângulo e
        direção de bússola.
      </p>
    );
  }

  const { result } = target;
  const {
    hub,
    tunnel,
    delta,
    distance,
    angleFromXAxis,
    compassDirection,
    isSamePoint,
  } = result;

  const state = isSamePoint
    ? "origem = destino"
    : hub.withinHub
      ? "dentro do raio"
      : previewing
        ? "prévia"
        : "calculada";
  const stateColor =
    isSamePoint || hub.withinHub
      ? "text-orange"
      : previewing
        ? "text-accent"
        : "text-muted";

  const noTunnel = isSamePoint || hub.withinHub;
  const exitLabel = noTunnel
    ? "nada a construir"
    : `X ${Math.round(hub.exitPoint.x)} · Z ${Math.round(hub.exitPoint.z)}`;
  const spineLabel =
    tunnel.centerline.length > 0 ? `${tunnel.centerline.length} blocos` : "0";
  const areaLabel =
    tunnel.approxArea > 0 ? `≈ ${Math.round(tunnel.approxArea)} bl` : "—";

  return (
    <div className="flex flex-col gap-2.5 rounded-sm border border-border bg-card p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-semibold text-heading">
          {target.title || "Novo caminho"}
        </span>
        <span
          className={`shrink-0 font-mono-ui text-[10px] uppercase tracking-wider ${stateColor}`}
        >
          {state}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[3px] border border-panel-border bg-panel-border">
        <StatCell label="ΔX" value={fmt(delta.dx)} />
        <StatCell label="ΔZ" value={fmt(delta.dz)} />
        <StatCell label="Distância" value={fmt(distance)} />
        <StatCell label="Ângulo" value={`${angleFromXAxis.toFixed(1)}°`} />
        <StatCell
          label="Bússola"
          value={compassDirection ?? "—"}
          valueClassName="text-orange"
        />
        <StatCell label="Área aprox." value={areaLabel} />
      </div>

      <div className="flex flex-col gap-1.5 font-mono-ui text-[11px] text-secondary">
        <div className="flex items-center justify-between gap-2">
          <span>Saída do túnel</span>
          <span className="text-accent-soft">{exitLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Blocos da espinha</span>
          <span className="text-accent-soft">{spineLabel}</span>
        </div>
      </div>
    </div>
  );
}
