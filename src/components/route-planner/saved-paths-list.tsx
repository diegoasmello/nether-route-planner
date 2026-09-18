"use client";

import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Point, RouteStyle } from "@/lib/minecraft/route";
import type { SavedPath } from "@/lib/storage/route-planner-storage";
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
  /** Pass `null` to deselect (e.g. clicking the already-selected row again). */
  onSelect: (id: string | null) => void;
  onCreate: (draft: PathDraft) => void;
  onUpdate: (id: string, draft: PathDraft) => void;
  onToggleVisible: (id: string) => void;
  onDelete: (id: string) => void;
  /** Fires on every draft change while creating/editing, and with `null` once editing ends — lets the canvas preview unsaved edits live. */
  onDraftChange: (preview: EditingPreview | null) => void;
}

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

const describePath = (
  path: Pick<SavedPath, "destination" | "routeStyle" | "tunnelWidth">,
) =>
  `X ${path.destination.x} · Z ${path.destination.z} · ${path.routeStyle === "orthogonal" ? "ortogonal" : "diagonal"} · ${path.tunnelWidth} ${
    path.tunnelWidth > 1 ? "blocos" : "bloco"
  }`;

const draftInputClass =
  "w-full rounded-[3px] border border-border-strong bg-input-alt px-2.5 py-2 text-[13px] text-heading outline-none transition-colors focus:border-accent";

function PathEditForm({
  formTitle,
  hubOrigin,
  draft,
  onChange,
  onConfirm,
  onCancel,
}: {
  formTitle: string;
  hubOrigin: Point;
  draft: PathDraft;
  onChange: (draft: PathDraft) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-sm border border-l-[3px] border-panel-border border-l-accent bg-card p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-heading">
          {formTitle}
        </span>
        <span className="font-mono-ui text-[10px] uppercase tracking-wider text-accent">
          prévia ao vivo
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-wider text-secondary">
          Nome do caminho
        </label>
        <input
          autoFocus
          type="text"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
          placeholder="ex. Base Principal"
          className={draftInputClass}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <NumberField
          label="Destino X"
          variant="draft"
          value={draft.destination.x}
          onChange={(x) =>
            onChange({ ...draft, destination: { x, z: draft.destination.z } })
          }
        />
        <NumberField
          label="Destino Z"
          variant="draft"
          value={draft.destination.z}
          onChange={(z) =>
            onChange({ ...draft, destination: { x: draft.destination.x, z } })
          }
        />
        <NumberField
          label="Largura"
          variant="draft"
          value={draft.tunnelWidth}
          onChange={(tunnelWidth) => onChange({ ...draft, tunnelWidth })}
          min={1}
        />
      </div>

      <RouteStyleToggle
        value={draft.routeStyle}
        onChange={(routeStyle) => onChange({ ...draft, routeStyle })}
        invertAxisOrder={draft.invertAxisOrder}
        onInvertAxisOrderChange={(invertAxisOrder) =>
          onChange({ ...draft, invertAxisOrder })
        }
        origin={hubOrigin}
        destination={draft.destination}
      />

      <div className="flex gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={onConfirm}
          disabled={draft.title.trim() === ""}
          className="flex-1 rounded-[3px] border border-btn-primary-border bg-btn-primary py-2.5 text-xs font-bold uppercase tracking-wider text-accent-bright transition-colors hover:bg-btn-primary-border disabled:cursor-not-allowed disabled:opacity-40"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-[3px] border border-border-strong py-2.5 text-xs font-semibold uppercase tracking-wider text-primary transition-colors hover:border-secondary hover:text-accent-strong"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function RowIconButton({
  onClick,
  title,
  colorClassName,
  hoverClassName,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  colorClassName: string;
  hoverClassName: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border border-transparent transition-colors ${colorClassName} ${hoverClassName}`}
    >
      {children}
    </button>
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Lets the canvas mirror unsaved edits live, without persisting them —
  // `onCreate`/`onUpdate` (only reached from "Salvar") are what persists.
  useEffect(() => {
    onDraftChange(editingId !== null && draft ? { editingId, draft } : null);
  }, [editingId, draft, onDraftChange]);

  const startCreating = () => {
    setConfirmDeleteId(null);
    setEditingId("new");
    setDraft(blankDraft(hubOrigin));
  };

  const startEditing = (path: SavedPath) => {
    setConfirmDeleteId(null);
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

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-soft">
          Caminhos <span className="text-muted">({paths.length})</span>
        </h2>
        <button
          type="button"
          onClick={startCreating}
          disabled={editingId !== null}
          className="rounded-[3px] border border-border-strong bg-chip px-2.5 py-1.5 text-[11.5px] font-semibold tracking-wide text-accent-strong transition-colors hover:border-accent hover:bg-chip-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Novo caminho
        </button>
      </div>

      {editingId !== null && draft ? (
        <PathEditForm
          formTitle={editingId === "new" ? "Novo caminho" : "Editar caminho"}
          hubOrigin={hubOrigin}
          draft={draft}
          onChange={setDraft}
          onConfirm={confirmEditing}
          onCancel={cancelEditing}
        />
      ) : null}

      <div className="flex flex-col gap-1.5">
        {paths
          .filter((path) => path.id !== editingId)
          .map((path) => {
            const isSelected = path.id === selectedId;
            const isConfirming = confirmDeleteId === path.id;
            return (
              <div
                key={path.id}
                className={`flex flex-col overflow-hidden rounded-sm border ${
                  isSelected
                    ? "border-accent-muted bg-card-selected"
                    : "border-panel-border bg-card"
                } ${path.visible ? "opacity-100" : "opacity-60"}`}
              >
                <div
                  onClick={() => onSelect(isSelected ? null : path.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      onSelect(isSelected ? null : path.id);
                  }}
                  aria-pressed={isSelected}
                  className="flex cursor-pointer items-center gap-2.5 px-2.5 py-2.5"
                >
                  <span
                    className={`h-2.25 w-2.25 shrink-0 rounded-[1px] ${
                      isSelected
                        ? "bg-accent"
                        : path.visible
                          ? "bg-dot-idle"
                          : "bg-dot-hidden"
                    }`}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={`truncate text-[13px] font-semibold ${isSelected ? "text-primary-strong" : "text-primary"}`}
                    >
                      {path.title}
                    </span>
                    <span className="truncate font-mono-ui text-[10.5px] text-faint">
                      {describePath(path)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <RowIconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisible(path.id);
                      }}
                      title={
                        path.visible ? "Ocultar no canvas" : "Exibir no canvas"
                      }
                      colorClassName={
                        path.visible ? "text-accent-soft" : "text-muted"
                      }
                      hoverClassName="hover:border-border-strong hover:bg-row-hover"
                    >
                      {path.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </RowIconButton>
                    <RowIconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        if (editingId === null) startEditing(path);
                      }}
                      title="Editar"
                      colorClassName={
                        editingId !== null
                          ? "cursor-not-allowed text-muted/50"
                          : "text-secondary"
                      }
                      hoverClassName={
                        editingId === null
                          ? "hover:border-border-strong hover:bg-row-hover hover:text-heading"
                          : ""
                      }
                    >
                      <Pencil size={14} />
                    </RowIconButton>
                    <RowIconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        if (editingId === null) setConfirmDeleteId(path.id);
                      }}
                      title="Excluir"
                      colorClassName={
                        editingId !== null
                          ? "cursor-not-allowed text-muted/50"
                          : "text-secondary"
                      }
                      hoverClassName={
                        editingId === null
                          ? "hover:border-danger-border hover:bg-danger-hover-bg hover:text-danger-hover-text"
                          : ""
                      }
                    >
                      <Trash2 size={14} />
                    </RowIconButton>
                  </div>
                </div>
                {isConfirming ? (
                  <div className="flex items-center gap-2 border-t border-danger-border bg-danger-bg px-2.5 py-2">
                    <span className="flex-1 font-mono-ui text-[11px] text-danger-text">
                      Excluir este caminho?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(path.id);
                        setConfirmDeleteId(null);
                      }}
                      className="rounded-[3px] border border-danger-strong-border bg-danger-strong px-2.5 py-1 text-[11px] font-semibold text-danger-text-strong transition-colors hover:bg-danger-strong-border"
                    >
                      Excluir
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-[3px] border border-border-muted px-2.5 py-1 text-[11px] text-primary transition-colors hover:border-secondary"
                    >
                      Manter
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        {paths.length === 0 ? (
          <p className="rounded-sm border border-dashed border-border p-4 text-center font-mono-ui text-[11.5px] leading-relaxed text-muted">
            Nenhum caminho ainda. Crie o primeiro túnel radiando do centro do
            hub.
          </p>
        ) : null}
      </div>
    </div>
  );
}
