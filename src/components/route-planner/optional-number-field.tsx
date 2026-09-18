"use client";

import { useId, useState } from "react";
import type { FieldVariant } from "./number-field";

interface OptionalNumberFieldProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
  variant?: FieldVariant;
}

const VARIANT_CLASS: Record<FieldVariant, string> = {
  hub: "border-border bg-input focus:border-accent focus:bg-input-focus",
  "hub-portal": "border-border bg-input focus:border-orange focus:bg-input-focus",
  draft: "border-border-strong bg-input-alt focus:border-accent",
};

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
  placeholder = "—",
  variant = "hub-portal",
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[10px] uppercase tracking-wider text-secondary">
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
          className={`w-full rounded-[3px] border px-2.5 py-2 font-mono-ui text-[13px] text-heading outline-none transition-colors placeholder:text-muted ${VARIANT_CLASS[variant]}`}
        />
        {suffix ? <span className="text-xs text-secondary">{suffix}</span> : null}
      </div>
    </div>
  );
}
