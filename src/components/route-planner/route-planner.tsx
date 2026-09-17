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
import { CoordinateInput } from "./coordinate-input";
import { NumberField } from "./number-field";
import { SavedPathsList, type EditingPreview, type PathDraft } from "./saved-paths-list";
import { RouteCanvas, type RouteCanvasHandle } from "./route-canvas";
import { RouteControls } from "./route-controls";

const DEFAULTS = {
  origin: { x: 100, z: -50 } satisfies Point,
  hubRadius: 20,
};

export function RoutePlanner() {
  const [origin, setOrigin] = useState<Point>(DEFAULTS.origin);
  const [hubRadius, setHubRadius] = useState(DEFAULTS.hubRadius);
  const [paths, setPaths] = useState<SavedPath[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingPreview, setEditingPreview] = useState<EditingPreview | null>(null);
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
    }
    const loadedPaths = loadSavedPaths();
    setPaths(loadedPaths);
    if (loadedPaths.length > 0) setSelectedId(loadedPaths[0].id);
    setSettingsLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!settingsLoaded) return;
    persistHubSettings({ origin, hubRadius });
  }, [settingsLoaded, origin, hubRadius]);

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
      return { id: editingPreview.editingId, title: draft.title, result: previewResult };
    }
    return selectedPath && selectedPath.visible && selectedResult
      ? { id: selectedPath.id, title: selectedPath.title, result: selectedResult }
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
      const next = prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p));
      persistSavedPaths(next);
      return next;
    });
  };

  return (
    <div className="flex flex-col lg:h-full lg:flex-row">
      <aside className="flex w-full flex-col gap-6 border-neutral-200 p-4 dark:border-neutral-800 lg:h-full lg:w-[340px] lg:shrink-0 lg:overflow-y-auto lg:border-r">
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Hub</h2>
          <CoordinateInput label="Centro do Hub" value={origin} onChange={setOrigin} />
          <NumberField label="Raio do hub" value={hubRadius} onChange={setHubRadius} min={0} />
        </div>

        <div className="h-px bg-neutral-200 dark:bg-neutral-800" />

        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Caminhos
          </h2>
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
        </div>
      </aside>

      <main className="relative min-h-[420px] p-4 lg:flex-1">
        <RouteCanvas ref={canvasRef} hubOrigin={origin} hubRadius={hubRadius} primary={primary} otherRoutes={otherRoutes} />
        <RouteControls
          onZoomIn={() => canvasRef.current?.zoomIn()}
          onZoomOut={() => canvasRef.current?.zoomOut()}
          onCenter={() => canvasRef.current?.centerRoute()}
        />
      </main>
    </div>
  );
}
