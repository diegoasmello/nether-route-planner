"use client";

import { useId, useState } from "react";

/**
 * "hub"/"hub-portal" match the always-visible Hub section inputs (violet vs.
 * orange focus accent); "draft" matches the edit-with-confirmation path form,
 * which uses a slightly lighter surface and never changes background on focus.
 */
export type FieldVariant = "hub" | "hub-portal" | "draft";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
  variant?: FieldVariant;
}

const VARIANT_CLASS: Record<FieldVariant, string> = {
  hub: "border-border bg-input focus:border-accent focus:bg-input-focus",
  "hub-portal": "border-border bg-input focus:border-orange focus:bg-input-focus",
  draft: "border-border-strong bg-input-alt focus:border-accent",
};

export function NumberField({ label, value, onChange, min, step = 1, suffix, variant = "hub" }: NumberFieldProps) {
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
          onChange={(e) => {
            const next = e.target.value;
            setRaw(next);
            const parsed = Number(next);
            if (next.trim() !== "" && Number.isFinite(parsed)) {
              onChange(parsed);
            }
          }}
          onBlur={() => setRaw(String(value))}
          className={`w-full rounded-[3px] border px-2.5 py-2 font-mono-ui text-[13px] text-heading outline-none transition-colors ${VARIANT_CLASS[variant]}`}
        />
        {suffix ? <span className="text-xs text-secondary">{suffix}</span> : null}
      </div>
    </div>
  );
}
