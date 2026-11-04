import React, { useEffect, useRef, useState } from 'react';
import { Intendencia } from '../../types';
import { useMapTooltip } from './MapTooltip';
import { metricasIti } from '../../utils/metricas';

interface PeruChoroplethProps {
  intendencias: Intendencia[];
  onSelectIti: (codigo: string) => void;
}

interface ItiPath {
  codigo: string;
  nombre?: string;
  d: string;
}

// Colores de demanda por ITI (idénticos al mapa original en HTML/JS)
const ROJO = '#ef4444';
const NARANJA = '#f97316';
const AMARILLO = '#facc15';
const VERDE = '#10b981';

const COLOR_POR_ITI: Record<string, string> = {
  iti_lima: ROJO,
  iti_huacho: ROJO,
  iti_arequipa: NARANJA,
  iti_lalibertad: NARANJA,
  iti_chimbote: NARANJA,
  iti_piura: AMARILLO,
  iti_cusco: AMARILLO,
  iti_madrededios: AMARILLO,
  iti_tumbes: AMARILLO,
};

const VISTA_PERU = [0, 0, 240, 340];
const DURACION_ZOOM_MS = 650;

export const PeruChoropleth: React.FC<PeruChoroplethProps> = ({ intendencias, onSelectIti }) => {
  const [paths, setPaths] = useState<ItiPath[]>([]);
  const [depLines, setDepLines] = useState<string>('');
  const [hover, setHover] = useState<string | null>(null);
  const { panelRef, show, hide, element } = useMapTooltip();

  // Zoom animado hacia la ITI elegida antes de abrir su página
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef<number>(0);
  const [viewBox, setViewBox] = useState<number[]>(VISTA_PERU);
  const [zoomando, setZoomando] = useState<string | null>(null);
  const [opacidad, setOpacidad] = useState<number>(1);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const zoomHacia = (cod: string) => {
    const el = svgRef.current?.querySelector<SVGPathElement>(`path[data-iti="${cod}"]`);
    if (zoomando) return;
    if (!el) {
      onSelectIti(cod);
      return;
    }
    const b = el.getBBox();
    const margen = Math.max(b.width, b.height) * 0.22;
    let w = b.width + margen * 2;
    let h = b.height + margen * 2;
    const proporcion = VISTA_PERU[2] / VISTA_PERU[3];
    if (w / h > proporcion) h = w / proporcion;
    else w = h * proporcion;
    const destino = [b.x + b.width / 2 - w / 2, b.y + b.height / 2 - h / 2, w, h];

    hide();
    setHover(null);
    setZoomando(cod);
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const k = Math.min(1, (ahora - inicio) / DURACION_ZOOM_MS);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // easeInOutCubic
      setViewBox(VISTA_PERU.map((v, i) => v + (destino[i] - v) * e));
      // En el último tramo el mapa se desvanece: la página de la ITI entra con un fundido
      setOpacidad(k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1);
      if (k < 1) frameRef.current = requestAnimationFrame(paso);
      else onSelectIti(cod);
    };
    frameRef.current = requestAnimationFrame(paso);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/data/peru_itis_paths.json').then((r) => r.json()),
      fetch('/data/peru_departamentos_lines.json').then((r) => r.json()),
    ])
      .then(([itis, deps]) => {
        if (cancelled) return;
        setPaths(itis);
        setDepLines(deps?.d || '');
      })
      .catch((err) => console.warn('No se pudieron cargar las geometrías del mapa:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  const porCodigo = new Map(intendencias.map((i) => [i.codigo, i]));
  const carga = (cod: string) => {
    const it = porCodigo.get(cod);
    return it ? metricasIti(it).enAtencion + metricasIti(it).enCola : 0;
  };
  const ranking = [...intendencias].sort((a, b) => carga(b.codigo) - carga(a.codigo));
  const top8 = ranking.slice(0, 8);
  const maxVal = top8.length ? carga(top8[0].codigo) : 100;
  const colorDe = (cod: string) => COLOR_POR_ITI[cod] || VERDE;
  const nombreCorto = (it: Intendencia) =>
    (it.nombre || it.siglas || '')
      .replace(/Intendencia\s+de\s+Tributos\s+Internos/gi, '')
      .replace(/Intendencia\s+Regional/gi, '')
      .replace(/Intendencia/gi, '')
      .replace(/ITI/gi, '')
      .trim() || it.codigo;

  const tooltipItem = (p: ItiPath) => (
    <>
      <span>{p.nombre || porCodigo.get(p.codigo)?.nombre || 'Intendencia'}</span>
      <svg
        className="iti-tooltip-chevron"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </>
  );

  return (
    <div className="card-nacional-exec-body">
      <div className="exec-map-panel" ref={panelRef}>
        <div className="peru-svg-container">
          <svg
            ref={svgRef}
            className="peru-choropleth-svg"
            viewBox={viewBox.join(' ')}
            style={{ opacity: opacidad }}
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => {
              hide();
              setHover(null);
            }}
          >
            <g id="g-mapa-itis">
              {paths.map((p) => (
                <path
                  key={p.codigo}
                  d={p.d}
                  fill={colorDe(p.codigo)}
                  stroke="#ffffff"
                  strokeWidth={hover === p.codigo ? 2.2 : 1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  data-iti={p.codigo}
                  style={{
                    cursor: zoomando ? 'default' : 'pointer',
                    opacity: zoomando && zoomando !== p.codigo ? 0.12 : 1,
                    transition: 'opacity 0.45s ease',
                    filter:
                      hover === p.codigo
                        ? 'brightness(1.15) drop-shadow(0 0 3px rgba(255,255,255,0.85))'
                        : undefined,
                  }}
                  onClick={() => zoomHacia(p.codigo)}
                  onMouseEnter={(e) => {
                    setHover(p.codigo);
                    show(e, tooltipItem(p));
                  }}
                  onMouseMove={(e) => show(e, tooltipItem(p))}
                  onMouseLeave={() => {
                    setHover(null);
                    hide();
                  }}
                />
              ))}
            </g>
            {depLines && <path id="path-dep-lines" d={depLines} />}
          </svg>
        </div>

        <div className="exec-map-floating-legend">
          {[
            ['dot--muy-alta', 'Muy alta'],
            ['dot--alta', 'Alta'],
            ['dot--media', 'Media'],
            ['dot--baja', 'Baja'],
          ].map(([cls, txt]) => (
            <div className="legend-row" key={cls}>
              <span className={`legend-dot ${cls}`} />
              <span className="legend-text">{txt}</span>
            </div>
          ))}
        </div>

        {element}
      </div>

      <div className="exec-ranking-panel">
        <div className="ranking-table-header">
          <span className="r-col-rank">Ranking</span>
          <span className="r-col-iti">ITI</span>
          <span className="r-col-carga">Carga</span>
        </div>
        <div className="iti-ranking-table-list">
          {top8.map((it, idx) => {
            const val = carga(it.codigo);
            const color = colorDe(it.codigo);
            const pct = Math.max(12, Math.min(100, Math.round((val / Math.max(1, maxVal)) * 95)));
            return (
              <div
                key={it.codigo}
                className={`ranking-table-row${hover === it.codigo ? ' ranking-bar-highlight' : ''}`}
                title={`${it.nombre}: ${val} tickets activos`}
                onClick={() => zoomHacia(it.codigo)}
                onMouseEnter={() => setHover(it.codigo)}
                onMouseLeave={() => setHover(null)}
              >
                <span className="r-col-rank">{idx + 1}</span>
                <div className="ranking-iti-wrap">
                  <span className="ranking-dot" style={{ background: color }} />
                  <span className="ranking-name">{nombreCorto(it)}</span>
                </div>
                <div className="ranking-track">
                  <div className="ranking-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="ranking-val">{val.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
