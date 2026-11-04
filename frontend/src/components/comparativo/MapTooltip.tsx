import React, { useCallback, useRef, useState } from 'react';

export interface TooltipState {
  x: number;
  y: number;
  content: React.ReactNode;
}

/** Tooltip tipo píldora (clase .iti-map-custom-tooltip) posicionado sobre el panel del mapa. */
export function useMapTooltip() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TooltipState | null>(null);

  const show = useCallback((e: React.MouseEvent, content: React.ReactNode) => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, content });
  }, []);

  const hide = useCallback(() => setTip(null), []);

  const element = tip ? (
    <div
      className="iti-map-custom-tooltip"
      style={{
        display: 'inline-flex',
        left: tip.x,
        top: tip.y,
        transform: tip.y < 45 ? 'translate(-50%, 18px)' : 'translate(-50%, -125%)',
      }}
    >
      {tip.content}
    </div>
  ) : null;

  return { panelRef, show, hide, element };
}
