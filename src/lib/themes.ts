export const THEMES = ['obsidian', 'forest', 'nord'] as const;
export type Theme = typeof THEMES[number];

export const THEME_LABELS: Record<Theme, string> = {
  obsidian: 'Obsidian (Dark)',
  forest: 'Forest (Natural)',
  nord: 'Nord (Cool)',
};

export const DEFAULT_THEME: Theme = 'obsidian';
export const THEME_STORAGE_KEY = 'chatsql_theme';
