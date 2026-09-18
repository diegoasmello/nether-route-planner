"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DICTIONARIES, type Dictionary, type Locale } from "./translations";

const LOCALE_KEY = "nether-route-planner:locale";
const DEFAULT_LOCALE: Locale = "pt-BR";

function isLocale(value: unknown): value is Locale {
  return value === "pt-BR" || value === "en";
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from localStorage (falling back to the browser's language) after
  // mount only — reading it during the initial render would desync from the
  // server-rendered HTML and trigger a hydration mismatch, the same
  // constraint route-planner.tsx works around for hub settings.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (isLocale(stored)) {
      setLocaleState(stored);
      return;
    }
    setLocaleState(navigator.language.toLowerCase().startsWith("pt") ? "pt-BR" : "en");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // storage unavailable (private mode, quota, ...) — locale choice just won't survive a reload
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: DICTIONARIES[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
