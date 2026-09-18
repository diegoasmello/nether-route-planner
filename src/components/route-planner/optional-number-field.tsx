"use client";

import { useId, useState } from "react";

interface OptionalNumberFieldProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
}

/**
 * Like `NumberField`, but an empty input is a valid, distinct state
 * (`undefined`) rather than something to fall back away from — for fields
 * where "not filled in" means a feature is off, not a missing required
 * value (e.g. hub portal count/width, which most hubs never set).
 */
export function OptionalNumberField({
  label,
  value,
  onChange,
  min,
  step = 1,
  suffix,
  placeholder,
}: OptionalNumberFieldProps) {
  const id = useId();
  const [raw, setRaw] = useState(value === undefined ? "" : String(value));
  const [lastValue, setLastValue] = useState(value);

  // Reset the draft text when `value` changes externally, same pattern as
  // NumberField (adjusting state during render, not an effect).
  if (value !== lastValue) {
    setLastValue(value);
    setRaw(value === undefined ? "" : String(value));
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
          placeholder={placeholder}
          onChange={(e) => {
            const next = e.target.value;
            setRaw(next);
            if (next.trim() === "") {
              onChange(undefined);
              return;
            }
            const parsed = Number(next);
            if (Number.isFinite(parsed)) {
              onChange(parsed);
            }
          }}
          onBlur={() => setRaw(value === undefined ? "" : String(value))}
          className="w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
        {suffix ? <span className="text-xs text-neutral-500 dark:text-neutral-400">{suffix}</span> : null}
      </div>
    </div>
  );
}
