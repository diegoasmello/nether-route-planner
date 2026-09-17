"use client";

import { useId, useState } from "react";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
}

export function NumberField({ label, value, onChange, min, step = 1, suffix }: NumberFieldProps) {
  const id = useId();
  const [raw, setRaw] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);

  // Reset the draft text when `value` changes externally (e.g. another
  // field's onChange recomputed it). Done during render, not an effect,
  // per React's "adjusting state when a prop changes" pattern.
  if (value !== lastValue) {
    setLastValue(value);
    setRaw(String(value));
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          step={step}
          value={raw}
          onChange={(e) => {
            const next = e.target.value;
            setRaw(next);
            const parsed = Number(next);
            if (next.trim() !== "" && Number.isFinite(parsed)) {
              onChange(parsed);
            }
          }}
          onBlur={() => setRaw(String(value))}
          className="w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
        {suffix ? <span className="text-xs text-neutral-500 dark:text-neutral-400">{suffix}</span> : null}
      </div>
    </div>
  );
}
