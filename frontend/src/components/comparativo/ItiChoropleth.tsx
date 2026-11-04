import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Sede } from '../../types';
import { useMapTooltip } from './MapTooltip';
import { metricasSede } from '../../utils/metricas';

interface ItiChoroplethProps {
  itiCodigo?: string;
  sedes: Sede[];
  onSelectSede: (codigo: string) => void;
  /** CSC resaltada desde fuera (p. ej. al pasar el cursor por su tarjeta) */
  hoverCodigo?: string | null;
  onHoverChange?: (codigo: string | null) => void;
}

/** Permite que las tarjetas de la página disparen el mismo zoom que el mapa */
export interface ItiMapaHandle {
  zoomHacia: (codigo: string) => void;
}

const DURACION_ZOOM_MS = 650;

interface ProvPath {
  provincia: string;
  d: string;
  has_csc?: boolean;
}

interface CscPin {
  codigo: string;
  nombre: string;
  provincia?: string;
  x: number;
  y: number;
}

interface ItiGeo {
  viewBox?: string;
  provincias: ProvPath[];
  cscs: CscPin[];
}

type Estado = 'rojo' | 'amarillo' | 'verde';
const SEMAFORO: Record<Estado, { color: string; label: string }> = {
  rojo: { color: '#ef4444', label: 'Alta demanda' },
  amarillo: { color: '#f59e0b', label: 'Demanda media' },
  verde: { color: '#10b981', label: 'Atención fluida' },
};

const activos = (s?: Sede) => (s ? metricasSede(s).enAtencion + metricasSede(s).enCola : 0);

// Semáforo de una sede: mismos umbrales que el mapa original
function estadoSede(s: Sede | undefined, maxVal: number): Estado {
  if (!s) return 'verde';
  const sla = s.resumen?.pct_espera_15m ?? 95;
  const tot = activos(s);
  const espMaxSeg = s.espera_max_seg ?? 0;
  if (sla < 85 || (maxVal >= 7 && tot >= Math.max(10, Math.round(maxVal * 0.95))) || espMaxSeg >= 900) return 'rojo';
  if (sla < 93 || (maxVal >= 6 && tot >= Math.max(7, Math.round(maxVal * 0.65))) || espMaxSeg >= 600) return 'amarillo';
  return 'verde';
}

const norm = (t?: string) => (t || '').toUpperCase().trim();

export const ItiChoropleth = forwardRef<ItiMapaHandle, ItiChoroplethProps>(function ItiChoropleth(
  { itiCodigo, sedes, onSelectSede, hoverCodigo, onHoverChange },
  ref
) {
  const [geo, setGeo] = useState<ItiGeo | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef<number>(0);
  const [vista, setVista] = useState<number[] | null>(null); // null = vista completa de la ITI
  const [opacidad, setOpacidad] = useState<number>(1);
  const [zoomando, setZoomando] = useState<string | null>(null);
  const [hoverLocal, setHoverLocal] = useState<string | null>(null);
  const hover = hoverCodigo ?? hoverLocal; // código de CSC resaltado
  const setHover = (c: string | null) => {
    setHoverLocal(c);
    onHoverChange?.(c);
  };
  const { panelRef, show, hide, element } = useMapTooltip();

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const vistaBase = (geo?.viewBox || '0 0 240 280').split(/\s+/).map(Number);

  // Zoom animado hacia la CSC elegida y luego abre su tablero
  const zoomHacia = (cod: string) => {
    if (zoomando) return;
    const pin = geo?.cscs.find((c) => c.codigo === cod);
    if (!pin) {
      onSelectSede(cod);
      return;
    }
    const w = vistaBase[2] * 0.28;
    const h = vistaBase[3] * 0.28;
    const destino = [pin.x - w / 2, pin.y - h / 2, w, h];
    hide();
    setHover(null);
    setZoomando(cod);
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const k = Math.min(1, (ahora - inicio) / DURACION_ZOOM_MS);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // easeInOutCubic
      setVista(vistaBase.map((v, i) => v + (destino[i] - v) * e));
      setOpacidad(k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1);
      if (k < 1) frameRef.current = requestAnimationFrame(paso);
      else onSelectSede(cod);
    };
    frameRef.current = requestAnimationFrame(paso);
  };

  useImperativeHandle(ref, () => ({ zoomHacia }));

  useEffect(() => {
    if (!itiCodigo) return;
    let cancelled = false;
    setGeo(null);
    fetch('/data/peru_itis_zoomed_paths.json')
      .then((r) => r.json())
      .then((all) => {
        if (!cancelled) setGeo(all[itiCodigo] || null);
      })
      .catch((err) => console.warn('No se pudieron cargar geometrías de la ITI:', err));
    return () => {
      cancelled = true;
    };
  }, [itiCodigo]);

  const sedesMap = new Map<string, Sede>();
  sedes.forEach((s) => {
    sedesMap.set(s.codigo, s);
    sedesMap.set(s.codigo.startsWith('csc_') ? s.codigo.replace('csc_', '') : `csc_${s.codigo}`, s);
  });

  const ranking = [...sedes].sort((a, b) => activos(b) - activos(a));
  const maxVal = Math.max(1, activos(ranking[0]));
  const top = ranking.slice(0, 8);

  const cscPorProv: Record<string, Sede[]> = {};
  (geo?.cscs || []).forEach((c) => {
    const s = sedesMap.get(c.codigo);
    const key = norm(c.provincia);
    if (s) {
      cscPorProv[key] = cscPorProv[key] || [];
      if (!cscPorProv[key].includes(s)) cscPorProv[key].push(s);
    }
  });

  const pill = (color: string, texto: React.ReactNode, label: string) => (
    <>
      <span style={{ background: color, width: 8, height: 8, borderRadius: '50%', display: 'inline-block', marginRight: 6 }} />
      <span>{texto}</span>
      <span style={{ color: '#64748b', marginLeft: 4 }}>({label})</span>
    </>
  );

  return (
    <div className="card-nacional-exec-body">
      <div className="exec-map-panel exec-map-panel-iti" ref={panelRef}>
        <div className="peru-svg-container mapa-entrada">
          <svg
            ref={svgRef}
            className="peru-choropleth-svg"
            viewBox={(vista ?? vistaBase).join(' ')}
            style={{ opacity: opacidad }}
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => {
              hide();
              setHover(null);
            }}
          >
            <g id="g-iti-provincias">
              {(geo?.provincias || []).map((p, i) => {
                const delProv = cscPorProv[norm(p.provincia)] || [];
                const activa = !!p.has_csc || delProv.length > 0;
                let estado: Estado = 'verde';
                if (delProv.length) {
                  const ests = delProv.map((s) => estadoSede(s, maxVal));
                  estado = ests.includes('rojo') ? 'rojo' : ests.includes('amarillo') ? 'amarillo' : 'verde';
                }
                const sem = SEMAFORO[estado];
                const interactiva = activa && delProv.length > 0;
                return (
                  <path
                    key={`${p.provincia}-${i}`}
                    d={p.d}
                    fill={interactiva ? sem.color : '#94a3b8'}
                    stroke="#ffffff"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className={
                      activa
                        ? `iti-prov-path iti-prov-active iti-prov--${estado}`
                        : 'iti-prov-path iti-prov-inactive'
                    }
                    onClick={interactiva ? () => zoomHacia(delProv[0].codigo) : undefined}
                    onMouseEnter={
                      interactiva
                        ? (e) => {
                            setHover(delProv[0].codigo);
                            show(
                              e,
                              pill(
                                sem.color,
                                <>
                                  {p.provincia}: <strong>{delProv.map((s) => s.nombre).join(' · ')}</strong>
                                </>,
                                sem.label
                              )
                            );
                          }
                        : undefined
                    }
                    onMouseLeave={
                      interactiva
                        ? () => {
                            setHover(null);
                            hide();
                          }
                        : undefined
                    }
                  />
                );
              })}
            </g>

            <g id="g-iti-csc-labels">
              {(geo?.cscs || []).map((c) => (
                <text
                  key={c.codigo}
                  x={c.x}
                  y={c.y + 7.8}
                  textAnchor="middle"
                  className={`iti-csc-label${hover === c.codigo ? ' pin-highlight' : ''}`}
                >
                  {c.nombre.replace(/^CSC\s+/i, '').trim()}
                </text>
              ))}
            </g>

            <g id="g-iti-csc-pins">
              {(geo?.cscs || []).map((c) => {
                const s = sedesMap.get(c.codigo);
                const sem = SEMAFORO[estadoSede(s, maxVal)];
                return (
                  <g
                    key={c.codigo}
                    className={`csc-map-pin${hover === c.codigo ? ' pin-highlight' : ''}`}
                    transform={`translate(${c.x}, ${c.y})`}
                    onClick={() => zoomHacia(c.codigo)}
                    onMouseEnter={(e) => {
                      setHover(c.codigo);
                      show(e, pill(sem.color, <strong>{c.nombre}</strong>, sem.label));
                    }}
                    onMouseLeave={() => {
                      setHover(null);
                      hide();
                    }}
                  >
                    <circle r="8" fill="transparent" style={{ cursor: 'pointer' }} />
                    <circle r="3.6" fill={sem.color} className="csc-map-pin-pulse" style={{ pointerEvents: 'none' }} />
                    <circle r="2.8" fill={sem.color} stroke="#ffffff" strokeWidth="0.9" style={{ pointerEvents: 'none' }} />
                    <circle r="0.95" fill="#ffffff" style={{ pointerEvents: 'none' }} />
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <div className="map-semaforo-legend-pills" title="Semáforo Operativo SUNAT">
          {(Object.keys(SEMAFORO) as Estado[]).map((k) => (
            <span className="map-legend-pill" key={k}>
              <span className="legend-color-dot" style={{ background: SEMAFORO[k].color }} />
              {SEMAFORO[k].label}
            </span>
          ))}
        </div>

        {element}
      </div>

      <div className="exec-ranking-panel">
        <div className="ranking-table-header">
          <span className="r-col-rank">Ranking</span>
          <span className="r-col-iti">CSC</span>
          <span className="r-col-carga">Carga</span>
        </div>
        <div className="iti-ranking-table-list">
          {top.map((s, idx) => {
            const val = activos(s);
            const sem = SEMAFORO[estadoSede(s, maxVal)];
            const pct = Math.max(14, Math.min(100, Math.round((val / maxVal) * 95)));
            return (
              <div
                key={s.codigo}
                className={`ranking-table-row${hover === s.codigo ? ' ranking-bar-highlight' : ''}`}
                title={`${s.nombre}: ${val} tickets activos (${sem.label})`}
                onClick={() => zoomHacia(s.codigo)}
                onMouseEnter={() => setHover(s.codigo)}
                onMouseLeave={() => setHover(null)}
              >
                <span className="r-col-rank">{idx + 1}</span>
                <div className="ranking-iti-wrap">
                  <span className="ranking-dot" style={{ background: sem.color }} />
                  <span className="ranking-name">{s.nombre.replace(/^CSC\s+/i, '').trim()}</span>
                </div>
                <div className="ranking-track">
                  <div className="ranking-fill" style={{ width: `${pct}%`, background: sem.color }} />
                </div>
                <span className="ranking-val">{val.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
