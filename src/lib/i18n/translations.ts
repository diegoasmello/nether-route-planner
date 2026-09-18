/**
 * UI-facing translations for the route planner. Kept minimal for now — only
 * the strings actually wired up to a locale-aware component belong here;
 * `lib/minecraft` stays language-neutral regardless.
 */

export type Locale = "pt-BR" | "en";

export interface Dictionary {
  sidebar: {
    subtitle: string;
  };
}

const ptBR: Dictionary = {
  sidebar: {
    subtitle: "Planejamento de túneis bloco a bloco",
  },
};

const en: Dictionary = {
  sidebar: {
    subtitle: "Block-by-block tunnel planning",
  },
};

export const DICTIONARIES: Record<Locale, Dictionary> = { "pt-BR": ptBR, en };

/** Each language's own name and short code, always shown in that language regardless of the active locale. */
export const LOCALE_META: readonly { value: Locale; code: string; label: string }[] = [
  { value: "pt-BR", code: "PT", label: "Português" },
  { value: "en", code: "EN", label: "English" },
];
