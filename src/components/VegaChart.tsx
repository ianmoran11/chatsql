import { useEffect, useRef } from 'react';
import type { View } from 'vega';

export default function VegaChart({ spec }: { spec: object }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    // Override spec dimensions so the chart fills its container
    const responsiveSpec = {
      ...(spec as Record<string, unknown>),
      width: 'container' as const,
      height: 300,
      autosize: { type: 'fit', contains: 'padding' },
    };

    import('vega-embed').then(({ default: embed }) => {
      if (cancelled || !containerRef.current) return;
      embed(containerRef.current, responsiveSpec as Parameters<typeof embed>[1], {
        actions: { export: true, source: false, compiled: false, editor: false },
        theme: 'dark',
      })
        .then((result) => {
          if (!cancelled) {
            viewRef.current = result.view;
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
  }, [spec]);

  // Resize chart when container width changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (viewRef.current) {
        try { viewRef.current.resize(); viewRef.current.run(); } catch { /* ignore */ }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef} className="w-full" />;
}
