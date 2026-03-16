import { useEffect, useRef } from 'react';

export default function VegaChart({ spec }: { spec: object }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let finalizeChart: (() => void) | null = null;

    import('vega-embed').then(({ default: embed }) => {
      if (cancelled || !containerRef.current) return;
      embed(containerRef.current, spec as Parameters<typeof embed>[1], {
        actions: { export: true, source: false, compiled: false, editor: false },
        theme: 'dark',
      })
        .then((result) => {
          finalizeChart = () => result.finalize();
        })
        .catch(console.error);
    });

    return () => {
      cancelled = true;
      finalizeChart?.();
    };
  }, [spec]);

  return <div ref={containerRef} className="w-full overflow-x-auto" />;
}
