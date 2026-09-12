"use client";

import { useMemo, useRef, useState } from "react";
import { planRoute, type Point } from "@/lib/minecraft/route";
import { CoordinateInput } from "./CoordinateInput";
import { NumberField } from "./NumberField";
import { RouteResults } from "./RouteResults";
import { RouteCanvas, type RouteCanvasHandle } from "./RouteCanvas";
import { RouteControls } from "./RouteControls";
import { RouteCoordinateList } from "./RouteCoordinateList";

const DEFAULTS = {
  origin: { x: 100, z: -50 } satisfies Point,
  destination: { x: 237, z: 184 } satisfies Point,
  hubRadius: 20,
  tunnelWidth: 3,
  tunnelHeight: 3,
};

export function RoutePlanner() {
  const [origin, setOrigin] = useState<Point>(DEFAULTS.origin);
  const [destination, setDestination] = useState<Point>(DEFAULTS.destination);
  const [hubRadius, setHubRadius] = useState(DEFAULTS.hubRadius);
  const [tunnelWidth, setTunnelWidth] = useState(DEFAULTS.tunnelWidth);
  const [tunnelHeight, setTunnelHeight] = useState(DEFAULTS.tunnelHeight);

  const canvasRef = useRef<RouteCanvasHandle>(null);

  const result = useMemo(
    () => planRoute({ origin, destination, hubRadius, tunnelWidth, tunnelHeight }),
    [origin, destination, hubRadius, tunnelWidth, tunnelHeight],
  );

  return (
    <div className="flex flex-col lg:h-full lg:flex-row">
      <aside className="flex w-full flex-col gap-6 border-neutral-200 p-4 dark:border-neutral-800 lg:h-full lg:w-[340px] lg:shrink-0 lg:overflow-y-auto lg:border-r">
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Configuração
          </h2>
          <CoordinateInput label="Centro do Hub" value={origin} onChange={setOrigin} />
          <CoordinateInput label="Portal" value={destination} onChange={setDestination} />
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Raio do hub" value={hubRadius} onChange={setHubRadius} min={0} />
            <NumberField label="Largura do túnel" value={tunnelWidth} onChange={setTunnelWidth} min={1} />
            <NumberField label="Altura do túnel" value={tunnelHeight} onChange={setTunnelHeight} min={1} />
          </div>
        </div>

        <div className="h-px bg-neutral-200 dark:bg-neutral-800" />

        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Resultados
          </h2>
          <RouteResults result={result} />
        </div>

        <div className="h-px bg-neutral-200 dark:bg-neutral-800" />

        <RouteCoordinateList blocks={result.tunnel.centerline} />
      </aside>

      <main className="relative min-h-[420px] p-4 lg:flex-1">
        <RouteCanvas ref={canvasRef} result={result} />
        <RouteControls
          onZoomIn={() => canvasRef.current?.zoomIn()}
          onZoomOut={() => canvasRef.current?.zoomOut()}
          onCenter={() => canvasRef.current?.centerRoute()}
        />
      </main>
    </div>
  );
}
