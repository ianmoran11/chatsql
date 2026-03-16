import { useEffect, useRef } from 'react';
import type { View } from 'vega';
import { useTheme } from '../contexts/ThemeContext';
import { VEGA_THEME_CONFIGS } from '../lib/themes';

// Deep merge: override wins over base; theme always overrides spec config for style properties
function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const ov = override[key];
    const bv = result[key];
    if (
      typeof ov === 'object' && ov !== null && !Array.isArray(ov) &&
      typeof bv === 'object' && bv !== null && !Array.isArray(bv)
    ) {
      result[key] = deepMerge(bv as Record<string, unknown>, ov as Record<string, unknown>);
    } else {
      result[key] = ov;
    }
  }
  return result;
}

export default function VegaChart({ spec }: { spec: object }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const specRecord = spec as Record<string, unknown>;
    const themeConfig = VEGA_THEME_CONFIGS[theme];

    // Deep merge: spec config is base (structural props), theme config overrides (colors/style always win)
    const specConfig = (specRecord.config as Record<string, unknown> | undefined) ?? {};
    const mergedConfig = deepMerge(specConfig, themeConfig);

    // Use fit-x so width fills the container but height is computed by Vega from content
    // This prevents squishing on charts with many categories
    const responsiveSpec: Record<string, unknown> = {
      ...specRecord,
      width: 'container' as const,
      autosize: { type: 'fit-x', contains: 'padding' },
      background: themeConfig.background,
      config: mergedConfig,
    };
    // Remove any height: 'container' from the spec so Vega computes a natural height
    if (responsiveSpec.height === 'container') {
      delete responsiveSpec.height;
    }

    import('vega-embed').then(({ default: embed }) => {
      if (cancelled || !containerRef.current) return;
      embed(containerRef.current, responsiveSpec as Parameters<typeof embed>[1], {
        actions: { export: true, source: false, compiled: false, editor: false },
      })
        .then((result) => {
          if (!cancelled) {
            viewRef.current = result.view;
            // After the first render, size the container to match the SVG's actual height
            requestAnimationFrame(() => {
              if (cancelled || !containerRef.current) return;
              const svg = containerRef.current.querySelector('svg');
              if (svg) {
                const svgH = parseFloat(svg.getAttribute('height') ?? '0');
                if (svgH > 0) {
                  containerRef.current.style.height = `${svgH}px`;
                }
              }
            });
          } else {
            result.finalize();
          }
        })
        .catch(console.error);
    });

    return () => {
      cancelled = true;
      if (viewRef.current) {
        try { viewRef.current.finalize(); } catch { /* ignore */ }
        viewRef.current = null;
      }
    };
  }, [spec, theme]);

  // Resize chart when container width changes; also re-sync height
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (viewRef.current) {
        try { viewRef.current.resize(); viewRef.current.run(); } catch { /* ignore */ }
        // Re-sync container height after a resize redraw
        requestAnimationFrame(() => {
          const svg = el.querySelector('svg');
          if (svg) {
            const svgH = parseFloat(svg.getAttribute('height') ?? '0');
            if (svgH > 0) el.style.height = `${svgH}px`;
          }
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef} className="w-full" style={{ minHeight: '200px' }} />;
}
