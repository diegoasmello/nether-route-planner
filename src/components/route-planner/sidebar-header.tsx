"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/locale-context";
import { LOCALE_META } from "@/lib/i18n/translations";

export function SidebarHeader() {
  const { locale, setLocale, t } = useLocale();
  const [langOpen, setLangOpen] = useState(false);
  const current = LOCALE_META.find((option) => option.value === locale) ?? LOCALE_META[0];

  return (
    <header className="flex shrink-0 flex-col gap-1.5 border-b border-panel-border px-4.5 py-4">
      <div className="flex items-center gap-2.5">
        <span className="block h-2.75 w-2.75 shrink-0 bg-accent shadow-[0_0_12px_var(--color-accent)]" />
        <h1 className="flex-1 text-[15px] font-bold uppercase tracking-[0.14em] text-heading">
          Nether Hub Route Planner
        </h1>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setLangOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={langOpen}
            className="flex items-center gap-1.25 rounded-[3px] border border-border bg-input px-2 py-1 font-mono-ui text-[11px] font-semibold tracking-[0.08em] text-[#c4c4cf] transition-colors hover:border-dot-idle hover:text-primary-strong"
          >
            <span>{current.code}</span>
            <span className="text-[8px] opacity-70">▾</span>
          </button>
          {langOpen ? (
            <div
              role="listbox"
              className="absolute right-0 top-[calc(100%+5px)] z-20 flex min-w-35 flex-col rounded-[4px] border border-border bg-[#17171c] p-1 shadow-[0_10px_26px_rgba(0,0,0,0.55)]"
            >
              {LOCALE_META.map((option) => {
                const selected = option.value === locale;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setLocale(option.value);
                      setLangOpen(false);
                    }}
                    className={`flex items-center justify-between gap-2 rounded-[3px] px-2 py-1.75 text-left text-xs transition-colors hover:bg-row-hover hover:text-primary-strong ${
                      selected ? "bg-row-hover text-primary-strong" : "text-secondary"
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className="font-mono-ui text-[10px] text-toggle-on-border">
                      {selected ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
      <p className="font-mono-ui text-[11.5px] leading-relaxed text-muted">
        {t.sidebar.subtitle}
      </p>
    </header>
  );
}
