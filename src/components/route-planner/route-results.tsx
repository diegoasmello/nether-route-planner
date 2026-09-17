import type { RoutePlanResult } from "@/lib/minecraft/route";

interface RouteResultsProps {
  result: RoutePlanResult;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-right text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {title}
      </h3>
      <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">{children}</div>
    </div>
  );
}

const fmt = (n: number, digits = 2) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

const signed = (n: number) => (n > 0 ? `+${fmt(n, 0)}` : fmt(n, 0));

export function RouteResults({ result }: RouteResultsProps) {
  if (result.isSamePoint) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        A origem e o destino são o mesmo ponto. Informe um portal diferente do centro do hub.
      </div>
    );
  }

  const { hub, tunnel } = result;

  return (
    <div className="flex flex-col gap-4">
      <Section title="Coordenadas">
        <Row label="Origem (X, Z)" value={`${fmt(result.origin.x, 0)}, ${fmt(result.origin.z, 0)}`} />
        <Row label="Destino (X, Z)" value={`${fmt(result.destination.x, 0)}, ${fmt(result.destination.z, 0)}`} />
      </Section>

      <Section title="Diferença e distância">
        <Row label="ΔX" value={signed(result.delta.dx)} />
        <Row label="ΔZ" value={signed(result.delta.dz)} />
        <Row label="Distância" value={`${fmt(result.distance)} blocos`} />
      </Section>

      <Section title="Direção">
        <Row label="Direção" value={result.compassDirection ?? "—"} />
        <Row label="Ângulo (eixo X, sentido +Z)" value={`${fmt(result.angleFromXAxis, 1)}°`} />
      </Section>

      <Section title="Margem do hub">
        <Row label="Raio configurado" value={`${fmt(hub.radius, 0)} blocos`} />
        <Row label="Portal dentro do raio" value={hub.withinHub ? "Sim" : "Não"} />
        <Row label="Início efetivo do túnel (X, Z)" value={`${fmt(tunnel.start.x, 1)}, ${fmt(tunnel.start.z, 1)}`} />
      </Section>

      <Section title="Túnel">
        <Row label="Fim (X, Z)" value={`${fmt(tunnel.end.x, 0)}, ${fmt(tunnel.end.z, 0)}`} />
        <Row label="Comprimento" value={`${fmt(tunnel.length)} blocos`} />
        <Row label="Largura" value={`${tunnel.width} blocos`} />
        <Row label="Altura" value={`${tunnel.height} blocos`} />
        <Row label="Área aprox. (comprimento × largura)" value={`${fmt(tunnel.approxArea, 0)} blocos²`} />
        <Row label="Volume aprox." value={`${fmt(tunnel.approxVolume, 0)} blocos³`} />
      </Section>
      <p className="text-xs text-neutral-400 dark:text-neutral-500">
        Área e volume são estimativas (comprimento × largura × altura); a trajetória discreta pode gerar
        sobreposições que fazem o número real de blocos divergir um pouco.
      </p>
    </div>
  );
}
