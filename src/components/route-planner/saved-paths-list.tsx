"use client";

import { useState } from "react";
import type { Point, RouteStyle } from "@/lib/minecraft/route";
import type { SavedPath } from "@/lib/storage/route-planner-storage";

interface SavedPathsListProps {
  paths: SavedPath[];
  currentDestination: Point;
  currentRouteStyle: RouteStyle;
  currentInvertAxisOrder: boolean;
  onSave: (title: string) => void;
  onLoad: (path: SavedPath) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onToggleVisible: (id: string) => void;
}

const STYLE_LABEL: Record<RouteStyle, string> = {
  diagonal: "Diagonal",
  orthogonal: "Reta",
};

const fmtCoord = (p: Point) => `X: ${p.x}, Z: ${p.z}`;

const describePath = (routeStyle: RouteStyle, invertAxisOrder: boolean) =>
  routeStyle === "orthogonal" && invertAxisOrder ? `${STYLE_LABEL[routeStyle]} · eixos invertidos` : STYLE_LABEL[routeStyle];

const textInputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

const confirmButtonClass =
  "rounded-md border border-emerald-500 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:opacity-40 dark:text-emerald-300";

const cancelButtonClass =
  "rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800";

export function SavedPathsList({
  paths,
  currentDestination,
  currentRouteStyle,
  currentInvertAxisOrder,
  onSave,
  onLoad,
  onRename,
  onDelete,
  onToggleVisible,
}: SavedPathsListProps) {
  const [savingTitle, setSavingTitle] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const confirmSaving = () => {
    if (savingTitle === null || savingTitle.trim() === "") return;
    onSave(savingTitle);
    setSavingTitle(null);
  };

  const startRenaming = (path: SavedPath) => {
    setRenamingId(path.id);
    setRenameTitle(path.title);
  };

  const confirmRenaming = () => {
    if (renamingId === null || renameTitle.trim() === "") return;
    onRename(renamingId, renameTitle);
    setRenamingId(null);
  };

  const handleDelete = (path: SavedPath) => {
    if (window.confirm(`Excluir o caminho "${path.title}"?`)) {
      onDelete(path.id);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {savingTitle === null ? (
        <button
          type="button"
          onClick={() => setSavingTitle("")}
          className="rounded-md border border-emerald-500 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
        >
          + Salvar caminho atual
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-md border border-neutral-200 p-2 dark:border-neutral-800">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {fmtCoord(currentDestination)} · {describePath(currentRouteStyle, currentInvertAxisOrder)}
          </span>
          <input
            autoFocus
            type="text"
            value={savingTitle}
            onChange={(e) => setSavingTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmSaving();
              if (e.key === "Escape") setSavingTitle(null);
            }}
            placeholder="Nome do caminho"
            className={textInputClass}
          />
          <div className="flex gap-2">
            <button type="button" onClick={confirmSaving} disabled={savingTitle.trim() === ""} className={confirmButtonClass}>
              Salvar
            </button>
            <button type="button" onClick={() => setSavingTitle(null)} className={cancelButtonClass}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {paths.length === 0 ? (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">Nenhum caminho salvo ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {paths.map((path) => (
            <li key={path.id} className="rounded-md border border-neutral-200 dark:border-neutral-800">
              {renamingId === path.id ? (
                <div className="flex flex-col gap-2 p-2">
                  <input
                    autoFocus
                    type="text"
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmRenaming();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className={textInputClass}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={confirmRenaming}
                      disabled={renameTitle.trim() === ""}
                      className={confirmButtonClass}
                    >
                      Salvar
                    </button>
                    <button type="button" onClick={() => setRenamingId(null)} className={cancelButtonClass}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => onLoad(path)}
                    title="Carregar este caminho"
                    className="flex min-w-0 flex-1 flex-col items-start text-left"
                  >
                    <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {path.title}
                    </span>
                    <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {fmtCoord(path.destination)} · {describePath(path.routeStyle, path.invertAxisOrder)}
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
                      onClick={() => startRenaming(path)}
                      title="Renomear"
                      aria-label="Renomear"
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(path)}
                      title="Excluir"
                      aria-label="Excluir"
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 dark:border-neutral-700 dark:text-red-400 dark:hover:bg-red-950"
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
