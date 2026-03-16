import { useEffect, useRef } from 'react';
import type { View } from 'vega';
import { useTheme } from '../contexts/ThemeContext';
import { VEGA_THEME_CONFIGS } from '../lib/themes';

export default function VegaChart({ spec }: { spec: object }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const specRecord = spec as Record<string, unknown>;
    const themeConfig = VEGA_THEME_CONFIGS[theme];

    // Make width responsive; preserve spec height if provided, otherwise use a sensible default
    const hasExplicitHeight =
      specRecord.height !== undefined && specRecord.height !== 'container';

    // Merge: theme config is the base, spec's own config overrides it
    const mergedConfig: Record<string, unknown> = {
      ...themeConfig,
      ...(specRecord.config as Record<string, unknown> | undefined),
    };

    const responsiveSpec: Record<string, unknown> = {
      ...specRecord,
      width: 'container' as const,
      height: hasExplicitHeight ? specRecord.height : 350,
      autosize: { type: 'fit', contains: 'padding' },
      background: themeConfig.background,
      config: mergedConfig,
    };

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

  return <div ref={containerRef} className="w-full" />;
}
