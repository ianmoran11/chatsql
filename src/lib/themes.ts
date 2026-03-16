export const THEMES = ['obsidian', 'forest', 'nord'] as const;
export type Theme = typeof THEMES[number];

export const THEME_LABELS: Record<Theme, string> = {
  obsidian: 'Obsidian (Dark)',
  forest: 'Forest (Natural)',
  nord: 'Nord (Cool)',
};

export const DEFAULT_THEME: Theme = 'obsidian';
export const THEME_STORAGE_KEY = 'chatsql_theme';

// Vega-Lite config objects matching each app theme
export const VEGA_THEME_CONFIGS: Record<Theme, Record<string, unknown>> = {
  obsidian: {
    background: '#111827',
    view: { fill: '#1f2937', stroke: '#374151' },
    mark: { color: '#818cf8' },
    axis: {
      gridColor: '#374151', gridOpacity: 0.6,
      domainColor: '#4b5563', tickColor: '#4b5563',
      labelColor: '#d1d5db', titleColor: '#e5e7eb',
    },
    legend: { labelColor: '#d1d5db', titleColor: '#e5e7eb' },
    title: { color: '#f3f4f6', subtitleColor: '#9ca3af' },
    header: { labelColor: '#d1d5db', titleColor: '#e5e7eb' },
    range: {
      category: ['#818cf8', '#34d399', '#f59e0b', '#f87171', '#60a5fa', '#a78bfa', '#fb7185'],
    },
  },
  forest: {
    background: '#242018',
    view: { fill: '#2e2a20', stroke: '#4a4236' },
    mark: { color: '#c89a38' },
    axis: {
      gridColor: '#4a4236', gridOpacity: 0.6,
      domainColor: '#6e6254', tickColor: '#6e6254',
      labelColor: '#c0b4a0', titleColor: '#d8cfc0',
    },
    legend: { labelColor: '#c0b4a0', titleColor: '#d8cfc0' },
    title: { color: '#d8cfc0', subtitleColor: '#9c8e7c' },
    header: { labelColor: '#c0b4a0', titleColor: '#d8cfc0' },
    range: {
      category: ['#c89a38', '#4a7c5a', '#b49050', '#8a6f2a', '#5a8c6a', '#d4ac4e', '#73592a'],
    },
  },
  nord: {
    background: '#20263a',
    view: { fill: '#252d44', stroke: '#3d4e68' },
    mark: { color: '#5aaac8' },
    axis: {
      gridColor: '#3d4e68', gridOpacity: 0.6,
      domainColor: '#5a7090', tickColor: '#5a7090',
      labelColor: '#a8c0d0', titleColor: '#c4d8e4',
    },
    legend: { labelColor: '#a8c0d0', titleColor: '#c4d8e4' },
    title: { color: '#c4d8e4', subtitleColor: '#7fa0b8' },
    header: { labelColor: '#a8c0d0', titleColor: '#c4d8e4' },
    range: {
      category: ['#5aaac8', '#5aae8a', '#f59e0b', '#f87171', '#7ac0d8', '#72be9c', '#2e7a9e'],
    },
  },
};
