"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { planRoute, type Point, type RouteStyle } from "@/lib/minecraft/route";
import {
  loadSavedPaths,
  loadSharedSettings,
  persistSavedPaths,
  persistSharedSettings,
  type SavedPath,
} from "@/lib/storage/route-planner-storage";
import { CoordinateInput } from "./coordinate-input";
import { NumberField } from "./number-field";
import { SavedPathsList } from "./saved-paths-list";
import { RouteCanvas, type RouteCanvasHandle } from "./route-canvas";
import { RouteControls } from "./route-controls";
import { RouteCoordinateList } from "./route-coordinate-list";
import { RouteStyleToggle } from "./route-style-toggle";

const DEFAULTS = {
  origin: { x: 100, z: -50 } satisfies Point,
  destination: { x: 237, z: 184 } satisfies Point,
  hubRadius: 20,
  tunnelWidth: 3,
  tunnelHeight: 3,
  routeStyle: "diagonal" as RouteStyle,
  invertAxisOrder: false,
};

export function RoutePlanner() {
  const [origin, setOrigin] = useState<Point>(DEFAULTS.origin);
  const [destination, setDestination] = useState<Point>(DEFAULTS.destination);
  const [hubRadius, setHubRadius] = useState(DEFAULTS.hubRadius);
  const [tunnelWidth, setTunnelWidth] = useState(DEFAULTS.tunnelWidth);
  const [tunnelHeight, setTunnelHeight] = useState(DEFAULTS.tunnelHeight);
  const [routeStyle, setRouteStyle] = useState<RouteStyle>(DEFAULTS.routeStyle);
  const [invertAxisOrder, setInvertAxisOrder] = useState(DEFAULTS.invertAxisOrder);
  const [paths, setPaths] = useState<SavedPath[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const canvasRef = useRef<RouteCanvasHandle>(null);

  // Hydrate from localStorage on mount only — reading it during the initial
  // render would desync from the server-rendered HTML and trigger a
  // hydration mismatch, so this stays a client-only effect (an accepted
  // exception to react-hooks/set-state-in-effect: there's no non-effect way
  // to reach localStorage before the first client render commits).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const settings = loadSharedSettings();
    if (settings) {
      setOrigin(settings.origin);
      setHubRadius(settings.hubRadius);
      setTunnelWidth(settings.tunnelWidth);
      setTunnelHeight(settings.tunnelHeight);
    }
    setPaths(loadSavedPaths());
    setSettingsLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!settingsLoaded) return;
    persistSharedSettings({ origin, hubRadius, tunnelWidth, tunnelHeight });
  }, [settingsLoaded, origin, hubRadius, tunnelWidth, tunnelHeight]);

  const result = useMemo(
    () => planRoute({ origin, destination, hubRadius, tunnelWidth, tunnelHeight, routeStyle, invertAxisOrder }),
    [origin, destination, hubRadius, tunnelWidth, tunnelHeight, routeStyle, invertAxisOrder],
  );

  const handleSavePath = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const newPath: SavedPath = {
      id: crypto.randomUUID(),
      title: trimmed,
      destination,
      routeStyle,
      invertAxisOrder,
      savedAt: new Date().toISOString(),
    };
    setPaths((prev) => {
      const next = [...prev, newPath];
      persistSavedPaths(next);
      return next;
    });
  };

  const handleLoadPath = (path: SavedPath) => {
    setDestination(path.destination);
    setRouteStyle(path.routeStyle);
    setInvertAxisOrder(path.invertAxisOrder);
  };

  const handleRenamePath = (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setPaths((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, title: trimmed } : p));
      persistSavedPaths(next);
      return next;
    });
  };

  const handleDeletePath = (id: string) => {
    setPaths((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistSavedPaths(next);
      return next;
    });
  };

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
          <RouteStyleToggle
            value={routeStyle}
            onChange={setRouteStyle}
            invertAxisOrder={invertAxisOrder}
            onInvertAxisOrderChange={setInvertAxisOrder}
          />
        </div>

        <div className="h-px bg-neutral-200 dark:bg-neutral-800" />

        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Caminhos salvos
          </h2>
          <SavedPathsList
            paths={paths}
            currentDestination={destination}
            currentRouteStyle={routeStyle}
            currentInvertAxisOrder={invertAxisOrder}
            onSave={handleSavePath}
            onLoad={handleLoadPath}
            onRename={handleRenamePath}
            onDelete={handleDeletePath}
          />
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
