"use client";

import { useEffect, useState } from "react";
import type { Point, RouteStyle } from "@/lib/minecraft/route";
import type { SavedPath } from "@/lib/storage/route-planner-storage";
import { CoordinateInput } from "./coordinate-input";
import { NumberField } from "./number-field";
import { RouteStyleToggle } from "./route-style-toggle";

/** Everything about a path except its identity/bookkeeping (id, visible, savedAt) — what the edit form produces. */
export interface PathDraft {
  title: string;
  destination: Point;
  tunnelWidth: number;
  routeStyle: RouteStyle;
  invertAxisOrder: boolean;
}

/** The path being edited (its id, or "new" while creating) plus its current, unsaved field values. */
export interface EditingPreview {
  editingId: string | "new";
  draft: PathDraft;
}

interface SavedPathsListProps {
  paths: SavedPath[];
  /** Hub center, used to seed a new path's destination field. */
  hubOrigin: Point;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (draft: PathDraft) => void;
  onUpdate: (id: string, draft: PathDraft) => void;
  onToggleVisible: (id: string) => void;
  onDelete: (id: string) => void;
  /** Fires on every draft change while creating/editing, and with `null` once editing ends — lets the canvas preview unsaved edits live. */
  onDraftChange: (preview: EditingPreview | null) => void;
}

const STYLE_LABEL: Record<RouteStyle, string> = {
  diagonal: "Diagonal",
  orthogonal: "Reta",
};

const fmtCoord = (p: Point) => `X: ${p.x}, Z: ${p.z}`;

const describePath = (path: Pick<SavedPath, "routeStyle" | "invertAxisOrder" | "tunnelWidth">) => {
  const style =
    path.routeStyle === "orthogonal" && path.invertAxisOrder
      ? `${STYLE_LABEL[path.routeStyle]} · eixos invertidos`
      : STYLE_LABEL[path.routeStyle];
  return `${style} · largura ${path.tunnelWidth}`;
};

const draftFromPath = (path: SavedPath): PathDraft => ({
  title: path.title,
  destination: path.destination,
  tunnelWidth: path.tunnelWidth,
  routeStyle: path.routeStyle,
  invertAxisOrder: path.invertAxisOrder,
});

const blankDraft = (hubOrigin: Point): PathDraft => ({
  title: "",
  destination: hubOrigin,
  tunnelWidth: 3,
  routeStyle: "diagonal",
  invertAxisOrder: false,
});

const textInputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

const confirmButtonClass =
  "rounded-md border border-emerald-500 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:opacity-40 dark:text-emerald-300";

const cancelButtonClass =
  "rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800";

function PathEditForm({
  draft,
  onChange,
  onConfirm,
  onCancel,
}: {
  draft: PathDraft;
  onChange: (draft: PathDraft) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-neutral-200 p-2 dark:border-neutral-800">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Nome do caminho</label>
        <input
          autoFocus
          type="text"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Nome do caminho"
          className={textInputClass}
        />
      </div>
      <CoordinateInput label="Portal" value={draft.destination} onChange={(destination) => onChange({ ...draft, destination })} />
      <NumberField
        label="Largura do túnel"
        value={draft.tunnelWidth}
        onChange={(tunnelWidth) => onChange({ ...draft, tunnelWidth })}
        min={1}
      />
      <RouteStyleToggle
        value={draft.routeStyle}
        onChange={(routeStyle) => onChange({ ...draft, routeStyle })}
        invertAxisOrder={draft.invertAxisOrder}
        onInvertAxisOrderChange={(invertAxisOrder) => onChange({ ...draft, invertAxisOrder })}
      />
      <div className="flex gap-2">
        <button type="button" onClick={onConfirm} disabled={draft.title.trim() === ""} className={confirmButtonClass}>
          Salvar
        </button>
        <button type="button" onClick={onCancel} className={cancelButtonClass}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function SavedPathsList({
  paths,
  hubOrigin,
  selectedId,
  onSelect,
  onCreate,
  onUpdate,
  onToggleVisible,
  onDelete,
  onDraftChange,
}: SavedPathsListProps) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<PathDraft | null>(null);

  // Lets the canvas mirror unsaved edits live, without persisting them —
  // `onCreate`/`onUpdate` (only reached from "Salvar") are what persists.
  useEffect(() => {
    onDraftChange(editingId !== null && draft ? { editingId, draft } : null);
  }, [editingId, draft, onDraftChange]);

  const startCreating = () => {
    setEditingId("new");
    setDraft(blankDraft(hubOrigin));
  };

  const startEditing = (path: SavedPath) => {
    setEditingId(path.id);
    setDraft(draftFromPath(path));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft(null);
  };

  const confirmEditing = () => {
    if (!draft || draft.title.trim() === "") return;
    const trimmed = { ...draft, title: draft.title.trim() };
    if (editingId === "new") {
      onCreate(trimmed);
    } else if (editingId !== null) {
      onUpdate(editingId, trimmed);
    }
    cancelEditing();
  };

  const handleDelete = (path: SavedPath) => {
    if (window.confirm(`Excluir o caminho "${path.title}"?`)) {
      onDelete(path.id);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {editingId === "new" && draft ? (
        <PathEditForm draft={draft} onChange={setDraft} onConfirm={confirmEditing} onCancel={cancelEditing} />
      ) : (
        <button
          type="button"
          onClick={startCreating}
          disabled={editingId !== null}
          className="rounded-md border border-emerald-500 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:opacity-40 dark:text-emerald-300"
        >
          + Novo caminho
        </button>
      )}

      {paths.length === 0 ? (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">Nenhum caminho salvo ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {paths.map((path) => (
            <li key={path.id} className="rounded-md border border-neutral-200 dark:border-neutral-800">
              {editingId === path.id && draft ? (
                <PathEditForm draft={draft} onChange={setDraft} onConfirm={confirmEditing} onCancel={cancelEditing} />
              ) : (
                <div
                  className={`flex items-center justify-between gap-2 p-2 ${
                    path.id === selectedId ? "bg-emerald-500/5" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(path.id)}
                    title="Selecionar este caminho"
                    aria-pressed={path.id === selectedId}
                    className="flex min-w-0 flex-1 flex-col items-start text-left"
                  >
                    <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {path.title}
                    </span>
                    <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {fmtCoord(path.destination)} · {describePath(path)}
                    </span>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleVisible(path.id)}
                      title={path.visible ? "Ocultar no canvas" : "Exibir no canvas"}
                      aria-label={path.visible ? "Ocultar no canvas" : "Exibir no canvas"}
                      aria-pressed={path.visible}
                      className={
                        path.visible
                          ? "rounded-md border border-emerald-500 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
                          : "rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800"
                      }
                    >
                      {path.visible ? "◉" : "◯"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing(path)}
                      disabled={editingId !== null}
                      title="Editar"
                      aria-label="Editar"
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(path)}
                      disabled={editingId !== null}
                      title="Excluir"
                      aria-label="Excluir"
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:border-neutral-700 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
