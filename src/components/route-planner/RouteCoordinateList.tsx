"use client";

import { useState } from "react";
import type { BlockCoord } from "@/lib/minecraft/route";

interface RouteCoordinateListProps {
  blocks: BlockCoord[];
}

const MAX_VISIBLE = 300;

export function RouteCoordinateList({ blocks }: RouteCoordinateListProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const asText = () => blocks.map((b, i) => `${i + 1}. X: ${b.x} | Z: ${b.z}`).join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(asText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-sm font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          {open ? "Ocultar" : "Mostrar"} coordenadas da rota ({blocks.length})
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={blocks.length === 0}
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {copied ? "Copiado!" : "Copiar coordenadas"}
        </button>
      </div>
      {open ? (
        <div className="max-h-64 overflow-y-auto border-t border-neutral-200 px-3 py-2 font-mono text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          {blocks.length === 0 ? (
            <p>Nenhum bloco a construir fora da área do hub.</p>
          ) : (
            <>
              {blocks.slice(0, MAX_VISIBLE).map((b, i) => (
                <div key={`${b.x},${b.z},${i}`}>
                  {i + 1}. X: {b.x} | Z: {b.z}
                </div>
              ))}
              {blocks.length > MAX_VISIBLE ? (
                <p className="mt-2 text-neutral-400 dark:text-neutral-500">
                  Mostrando {MAX_VISIBLE} de {blocks.length} blocos. Use &quot;Copiar coordenadas&quot; para obter a
                  lista completa.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
