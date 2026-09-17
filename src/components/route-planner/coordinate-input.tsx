"use client";

import type { Point } from "@/lib/minecraft/route";
import { NumberField } from "./number-field";

interface CoordinateInputProps {
  label: string;
  value: Point;
  onChange: (value: Point) => void;
}

export function CoordinateInput({ label, value, onChange }: CoordinateInputProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X" value={value.x} onChange={(x) => onChange({ x, z: value.z })} />
        <NumberField label="Z" value={value.z} onChange={(z) => onChange({ x: value.x, z })} />
      </div>
    </fieldset>
  );
}
