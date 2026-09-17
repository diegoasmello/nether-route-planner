import type { RouteStyle } from "@/lib/minecraft/route";

interface RouteStyleToggleProps {
  value: RouteStyle;
  onChange: (value: RouteStyle) => void;
  invertAxisOrder: boolean;
  onInvertAxisOrderChange: (value: boolean) => void;
}

const OPTIONS: { value: RouteStyle; label: string; description: string }[] = [
  { value: "diagonal", label: "Diagonal", description: "Segue a linha ideal (escadinha de blocos)." },
  { value: "orthogonal", label: "Reta", description: "Dois trechos retos em ângulo reto (\"L\")." },
];

export function RouteStyleToggle({ value, onChange, invertAxisOrder, onInvertAxisOrderChange }: RouteStyleToggleProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Estilo do túnel</span>
      <div className="grid grid-cols-2 gap-1.5">
        {OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              title={option.description}
              className={`rounded-md border px-2.5 py-1.5 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                selected
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-neutral-400 dark:text-neutral-500">
        {OPTIONS.find((option) => option.value === value)?.description}
      </p>
      {value === "orthogonal" ? (
        <label className="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <input
            type="checkbox"
            checked={invertAxisOrder}
            onChange={(e) => onInvertAxisOrderChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 dark:border-neutral-700"
          />
          Inverter ordem dos eixos (menor trecho primeiro)
        </label>
      ) : null}
    </div>
  );
}
