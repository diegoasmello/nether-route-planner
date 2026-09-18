"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { planRoute, type Point } from "@/lib/minecraft/route";
import {
  loadHubSettings,
  loadSavedPaths,
  persistHubSettings,
  persistSavedPaths,
  type SavedPath,
} from "@/lib/storage/route-planner-storage";
import { CanvasCompass } from "./canvas-compass";
import { CanvasLegend } from "./canvas-legend";
import { NumberField } from "./number-field";
import { OptionalNumberField } from "./optional-number-field";
import {
  SavedPathsList,
  type EditingPreview,
  type PathDraft,
} from "./saved-paths-list";
import { RouteCanvas, type RouteCanvasHandle } from "./route-canvas";
import { RouteControls } from "./route-controls";
import { RouteSummary, type RouteSummaryTarget } from "./route-summary";
import { SidebarHeader } from "./sidebar-header";

const DEFAULTS = {
  origin: { x: 100, z: -50 } satisfies Point,
  hubRadius: 20,
};

export function RoutePlanner() {
  const [origin, setOrigin] = useState<Point>(DEFAULTS.origin);
  const [hubRadius, setHubRadius] = useState(DEFAULTS.hubRadius);
  const [portalCount, setPortalCount] = useState<number | undefined>(undefined);
  const [portalWidth, setPortalWidth] = useState<number | undefined>(undefined);
  const [paths, setPaths] = useState<SavedPath[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingPreview, setEditingPreview] = useState<EditingPreview | null>(
    null,
  );
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const canvasRef = useRef<RouteCanvasHandle>(null);

  // Hydrate from localStorage on mount only — reading it during the initial
  // render would desync from the server-rendered HTML and trigger a
  // hydration mismatch, so this stays a client-only effect (an accepted
  // exception to react-hooks/set-state-in-effect: there's no non-effect way
  // to reach localStorage before the first client render commits).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const settings = loadHubSettings();
    if (settings) {
      setOrigin(settings.origin);
      setHubRadius(settings.hubRadius);
      setPortalCount(settings.portalCount);
      setPortalWidth(settings.portalWidth);
    }
    setPaths(loadSavedPaths());
    setSettingsLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!settingsLoaded) return;
    persistHubSettings({ origin, hubRadius, portalCount, portalWidth });
  }, [settingsLoaded, origin, hubRadius, portalCount, portalWidth]);

  const selectedPath = paths.find((p) => p.id === selectedId) ?? null;

  // The route currently selected in the list, regardless of its canvas
  // visibility (selection and visibility are independent: hiding a path
  // only affects whether it's drawn).
  const selectedResult = useMemo(
    () =>
      selectedPath
        ? planRoute({
            origin,
            destination: selectedPath.destination,
            hubRadius,
            tunnelWidth: selectedPath.tunnelWidth,
            routeStyle: selectedPath.routeStyle,
            invertAxisOrder: selectedPath.invertAxisOrder,
          })
        : null,
    [selectedPath, origin, hubRadius],
  );

  // The canvas's bright, on-top route: while creating/editing a path, its
  // live (unsaved) field values — so the canvas mirrors edits as they
  // happen, regardless of the underlying path's own visibility toggle.
  // Otherwise, the selected path, but only if it's actually visible —
  // selection never overrides the visibility toggle.
  const primary = useMemo(() => {
    if (editingPreview) {
      const draft = editingPreview.draft;
      const previewResult = planRoute({
        origin,
        destination: draft.destination,
        hubRadius,
        tunnelWidth: draft.tunnelWidth,
        routeStyle: draft.routeStyle,
        invertAxisOrder: draft.invertAxisOrder,
      });
      return {
        id: editingPreview.editingId,
        title: draft.title,
        result: previewResult,
      };
    }
    return selectedPath && selectedPath.visible && selectedResult
      ? {
          id: selectedPath.id,
          title: selectedPath.title,
          result: selectedResult,
        }
      : null;
  }, [editingPreview, origin, hubRadius, selectedPath, selectedResult]);

  // Every other visible saved path, drawn muted alongside the primary one,
  // sharing the hub center/radius (shared settings, not part of any path).
  // The path currently occupying the primary slot is excluded here so it
  // doesn't also render as a second, stale copy of itself.
  const excludedFromOther = editingPreview
    ? editingPreview.editingId !== "new"
      ? editingPreview.editingId
      : null
    : selectedId;

  const otherRoutes = useMemo(
    () =>
      paths
        .filter((p) => p.visible && p.id !== excludedFromOther)
        .map((p) => ({
          id: p.id,
          title: p.title,
          result: planRoute({
            origin,
            destination: p.destination,
            hubRadius,
            tunnelWidth: p.tunnelWidth,
            routeStyle: p.routeStyle,
            invertAxisOrder: p.invertAxisOrder,
          }),
        })),
    [paths, excludedFromOther, origin, hubRadius],
  );

  const handleCreatePath = (draft: PathDraft) => {
    const newPath: SavedPath = {
      id: crypto.randomUUID(),
      ...draft,
      visible: true,
      savedAt: new Date().toISOString(),
    };
    setPaths((prev) => {
      const next = [...prev, newPath];
      persistSavedPaths(next);
      return next;
    });
    setSelectedId(newPath.id);
  };

  const handleUpdatePath = (id: string, draft: PathDraft) => {
    setPaths((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...draft } : p));
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
    setSelectedId((current) => (current === id ? null : current));
  };

  const handleToggleVisible = (id: string) => {
    setPaths((prev) => {
      const next = prev.map((p) =>
        p.id === id ? { ...p, visible: !p.visible } : p,
      );
      persistSavedPaths(next);
      return next;
    });
  };

  // The sidebar's "Rota calculada" summary always reflects the selected
  // path, regardless of its own canvas visibility — unlike `primary`, which
  // only takes over the canvas's bright slot for a visible path. While
  // creating/editing, it mirrors `primary`'s live draft preview instead,
  // which for the same reason is never gated on visibility either.
  const summaryRoute: RouteSummaryTarget | null = editingPreview
    ? primary
    : selectedPath && selectedResult
      ? { title: selectedPath.title, result: selectedResult }
      : null;

  const portalCapacityActive = Boolean(
    portalCount && portalWidth && portalCount > 0 && portalWidth > 0,
  );
  const portalHint = portalCapacityActive
    ? `${Math.floor(portalCount!)} slots ativos`
    : "inativa";
  const hubNote =
    hubRadius === 0
      ? "Raio 0 — os túneis começam no próprio centro do hub."
      : portalCapacityActive
        ? `Os ${Math.floor(portalCount!)} portais são distribuídos igualmente pelo perímetro, ${portalWidth} blocos cada.`
        : "Preencha quantidade e largura para pintar os slots de portal sobre o anel.";

  return (
    <div className="flex flex-col lg:h-full lg:flex-row">
      <aside className="flex w-full flex-col border-panel-border bg-panel lg:h-full lg:w-89 lg:min-w-65 lg:shrink-0 lg:overflow-hidden lg:border-r">
        <SidebarHeader />

        <div className="flex flex-col gap-5.5 overflow-y-auto px-4.5 pb-7 pt-4 lg:min-h-0 lg:flex-1">
          <section className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-soft">
                Hub
              </h2>
              <span className="font-mono-ui text-[10px] uppercase tracking-wider text-muted">
                salvo automaticamente
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <NumberField
                label="Centro X"
                value={origin.x}
                onChange={(x) => setOrigin({ x, z: origin.z })}
              />
              <NumberField
                label="Centro Z"
                value={origin.z}
                onChange={(z) => setOrigin({ x: origin.x, z })}
              />
              <NumberField
                label="Raio"
                value={hubRadius}
                onChange={setHubRadius}
                min={0}
              />
            </div>

            <div className="flex flex-col gap-2 rounded-sm border border-dashed border-border bg-card p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] uppercase tracking-wider text-primary">
                  Capacidade de portais
                </span>
                <span
                  className={`font-mono-ui text-[10px] uppercase tracking-wider ${portalCapacityActive ? "text-orange" : "text-muted"}`}
                >
                  {portalHint}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <OptionalNumberField
                  label="Quantidade"
                  value={portalCount}
                  onChange={setPortalCount}
                  min={1}
                />
                <OptionalNumberField
                  label="Largura (blocos)"
                  value={portalWidth}
                  onChange={setPortalWidth}
                  min={1}
                />
              </div>
            </div>

            <p className="font-mono-ui text-[11px] leading-relaxed text-muted">
              {hubNote}
            </p>
          </section>

          <section className="flex flex-col gap-2.5">
            <SavedPathsList
              paths={paths}
              hubOrigin={origin}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onCreate={handleCreatePath}
              onUpdate={handleUpdatePath}
              onToggleVisible={handleToggleVisible}
              onDelete={handleDeletePath}
              onDraftChange={setEditingPreview}
            />
          </section>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
              Rota calculada
            </h2>
            <RouteSummary
              target={summaryRoute}
              previewing={editingPreview !== null}
            />
          </section>
        </div>
      </aside>

      <main className="relative min-h-105 lg:flex-1">
        <RouteCanvas
          ref={canvasRef}
          hubOrigin={origin}
          hubRadius={hubRadius}
          portalCount={portalCount}
          portalWidth={portalWidth}
          primary={primary}
          otherRoutes={otherRoutes}
        />
        <RouteControls
          onZoomIn={() => canvasRef.current?.zoomIn()}
          onZoomOut={() => canvasRef.current?.zoomOut()}
          onCenter={() => canvasRef.current?.centerRoute()}
        />
        <CanvasLegend />
        <CanvasCompass />
      </main>
    </div>
  );
}
