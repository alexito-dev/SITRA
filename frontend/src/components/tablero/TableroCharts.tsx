import React, { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, LineChart } from 'lucide-react';
import { INTERVALOS_30M, siguienteIntervalo } from './helpers';

export interface FilaIntervalo {
  intervalo?: string;
  hora?: number;
  minuto?: number;
  emitidos?: number;
  flujo?: number;
  promedio_hora?: number;
  promedio_dia?: number;
  promedio_mes?: number;
}

interface TableroChartsProps {
  demanda: FilaIntervalo[];
  flujoDia: FilaIntervalo[];
  flujoMes: FilaIntervalo[];
  /** Fecha/hora actual (se refresca cada segundo desde la página) */
  ahora: Date;
}

// Geometría del lienzo (idéntica al HTML original)
const ANCHO = 620;
const BASE_Y = 92;
const MAX_BAR = 70;
const PAD_L = 30;
const PAD_R = 14;
const CHART_W = ANCHO - PAD_L - PAD_R;
const N = INTERVALOS_30M.length;
const SLOT = CHART_W / N;
const BAR_W = 18;
const AZUL = '#0163ac'; // azul SUNAT
const ROJO = '#e7000b'; // rojo SUNAT
const VIVO = '#10b981';

const normalizarIntervalo = (f: FilaIntervalo): string | null => {
  let intv = f.intervalo;
  if (!intv && f.hora !== undefined) {
    intv = `${String(f.hora).padStart(2, '0')}:${(f.minuto ?? 0) >= 30 ? '30' : '00'}`;
  }
  if (!intv || !intv.includes(':')) return null;
  const [h, m] = intv.split(':');
  intv = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  if (intv < '08:30') intv = '08:30';
  if (intv > '18:00') intv = '18:00';
  return intv;
};

const agrupar = (filas: FilaIntervalo[], campo: 'emitidos' | 'flujo') => {
  const mapa: Record<string, FilaIntervalo & { valor: number }> = {};
  filas.forEach((f) => {
    const intv = normalizarIntervalo(f);
    if (!intv) return;
    const v = (campo === 'emitidos' ? f.emitidos : f.flujo ?? f.emitidos) ?? 0;
    if (mapa[intv]) mapa[intv].valor += v;
    else mapa[intv] = { ...f, intervalo: intv, valor: v };
  });
  return mapa;
};

interface TipState {
  x: number;
  y: number;
  html: React.ReactNode;
}

const Grid: React.FC<{ maxVal: number }> = ({ maxVal }) => (
  <>
    {[1.0, 0.5].map((lvl) => {
      const gy = BASE_Y - Math.round(lvl * MAX_BAR);
      return (
        <g key={lvl}>
          <line x1={PAD_L} y1={gy} x2={ANCHO - PAD_R} y2={gy} stroke="#eef2f6" strokeWidth="1" />
          <text x={PAD_L - 6} y={gy + 2.5} textAnchor="end" fontSize="7" fontWeight="500" fill="#94a3b8">
            {Math.round(lvl * maxVal)}
          </text>
        </g>
      );
    })}
    <line x1={PAD_L} y1={BASE_Y} x2={ANCHO - PAD_R} y2={BASE_Y} stroke="#e2e8f0" strokeWidth="1" />
    <text x={PAD_L - 6} y={BASE_Y + 2.5} textAnchor="end" fontSize="7" fontWeight="500" fill="#94a3b8">0</text>
  </>
);

export const TableroCharts: React.FC<TableroChartsProps> = ({ demanda, flujoDia, flujoMes, ahora }) => {
  const [vistaFlujo, setVistaFlujo] = useState<'dia' | 'mes'>(() => {
    try {
      return localStorage.getItem('sitra_flujo_vista') === 'mes' ? 'mes' : 'dia';
    } catch {
      return 'dia';
    }
  });
  const [tip, setTip] = useState<TipState | null>(null);
  const [cruce, setCruce] = useState<number | null>(null);

  const esDia = vistaFlujo === 'dia';
  const curMin = ahora.getHours() * 60 + ahora.getMinutes();
  const dentroJornada = curMin >= 510 && curMin <= 1080;

  const cambiarVista = (v: 'dia' | 'mes') => {
    setVistaFlujo(v);
    try {
      localStorage.setItem('sitra_flujo_vista', v);
    } catch {
      /* sin almacenamiento */
    }
  };

  // ---- Histograma ----
  const hist = useMemo(() => {
    const mapa = agrupar(demanda, 'emitidos');
    const puntos = INTERVALOS_30M.map((intv, idx) => {
      const [h, m] = intv.split(':').map(Number);
      const start = h * 60 + m;
      const val = mapa[intv]?.valor ?? 0;
      return {
        idx,
        label: intv,
        nextLabel: siguienteIntervalo(intv),
        minuto: m,
        val,
        isCurrent: curMin >= start && curMin < start + 30,
        esFuturo: dentroJornada && start > curMin && val === 0,
        isPeak: false,
      };
    });
    const total = puntos.reduce((a, p) => a + p.val, 0);
    const peak = Math.max(0, ...puntos.map((p) => p.val));
    puntos.forEach((p) => {
      p.isPeak = p.val > 0 && p.val === peak;
    });
    const maxVal = Math.max(10, Math.ceil(peak > 0 ? peak * 1.25 : 10));
    return { puntos, total, peak, maxVal, pico: puntos.find((p) => p.isPeak) };
  }, [demanda, curMin, dentroJornada]);

  // ---- Curva de flujo ----
  const flujo = useMemo(() => {
    const mapa = agrupar(esDia ? flujoDia : flujoMes, 'flujo');
    const puntos = INTERVALOS_30M.map((intv, idx) => {
      const [h, m] = intv.split(':').map(Number);
      const start = h * 60 + m;
      const val = mapa[intv]?.valor ?? 0;
      return {
        idx,
        label: intv,
        nextLabel: siguienteIntervalo(intv),
        minuto: m,
        flujo: val,
        promHora: mapa[intv]?.promedio_hora ?? 0,
        isCurrent: curMin >= start && curMin < start + 30,
        esFuturo: dentroJornada && start > curMin && val === 0,
        isPeak: false,
      };
    });
    const total = puntos.reduce((a, p) => a + p.flujo, 0);
    const concluidos = puntos.filter((p) => !p.esFuturo).length || 1;
    const prom = total > 0 ? total / concluidos : 0;
    const peak = Math.max(0, ...puntos.map((p) => p.flujo));
    puntos.forEach((p) => {
      p.isPeak = p.flujo > 0 && p.flujo === peak;
    });
    const maxFlujo = Math.max(10, Math.ceil(Math.max(peak, prom * 1.3) * 1.2));
    const coords = puntos.map((p, i) => {
      const cx = Math.round(PAD_L + i * SLOT + SLOT / 2);
      const h = p.flujo > 0 ? Math.max(4, Math.round((p.flujo / maxFlujo) * MAX_BAR)) : 0;
      return [cx, BASE_Y - h] as [number, number];
    });
    let d = `M ${coords[0][0]},${coords[0][1]}`;
    for (let i = 1; i < coords.length; i++) {
      const [x0, y0] = coords[i - 1];
      const [x1, y1] = coords[i];
      const mx = Math.round((x0 + x1) / 2);
      d += ` C ${mx},${y0} ${mx},${y1} ${x1},${y1}`;
    }
    const area = `${d} L ${coords[coords.length - 1][0]},${BASE_Y} L ${coords[0][0]},${BASE_Y} Z`;
    return { puntos, total, maxFlujo, coords, d, area };
  }, [flujoDia, flujoMes, esDia, curMin, dentroJornada]);

  // Marcador "AHORA" en el histograma
  let liveX: number | null = null;
  if (dentroJornada) {
    const frac = (curMin - 510 + ahora.getSeconds() / 60) / (1080 - 510);
    liveX = Math.round(PAD_L + frac * CHART_W);
  }

  const mostrarTip = (e: React.MouseEvent, html: React.ReactNode) =>
    setTip({ x: e.clientX, y: e.clientY, html });

  const tipEstilo = (): React.CSSProperties => {
    if (!tip) return {};
    const w = 150;
    let left = tip.x;
    if (left + w / 2 > window.innerWidth - 12) left = window.innerWidth - 12 - w / 2;
    if (left - w / 2 < 12) left = 12 + w / 2;
    let top = tip.y - 14;
    if (top - 70 < 10) top = tip.y + 24;
    return { left, top };
  };

  return (
    <>
      <section className="top-reports-grid">
        {/* REPORTE 1: HISTOGRAMA DE DEMANDA */}
        <div className="report-card report-card--chart">
          <header className="report-card__header">
            <div className="report-card__title">
              <BarChart3 size={14} style={{ color: 'var(--primary)' }} />
              <span>Histograma de Demanda</span>
              {hist.total > 0 && (
                <span className="chart-live-chip chart-live-chip--flow" style={{ display: 'inline-flex' }}>
                  Total: <b>{hist.total}</b> t.
                </span>
              )}
            </div>
            <div className="report-card__legend">
              <span className="legend-chip"><span className="legend-color legend-color--bar" /> Emitidos</span>
              <span className="legend-chip"><span className="legend-color legend-color--peak" /> Pico</span>
            </div>
          </header>
          <div className="chart-svg-wrap">
            <svg viewBox="0 0 620 120" preserveAspectRatio="none" onMouseLeave={() => setTip(null)}>
              <Grid maxVal={hist.maxVal} />
              <g>
                {hist.puntos.map((p, i) => {
                  const barH = p.val > 0 ? Math.max(6, Math.round((p.val / hist.maxVal) * MAX_BAR)) : 0;
                  const cx = Math.round(PAD_L + i * SLOT + SLOT / 2);
                  const y = BASE_Y - barH;
                  const fill = p.isPeak ? ROJO : AZUL;
                  return (
                    <g
                      key={p.label}
                      className={`histogram-col${p.isCurrent ? ' histogram-col--current' : ''}`}
                      onMouseMove={(e) =>
                        mostrarTip(
                          e,
                          <>
                            <div className="tip-header">
                              <span className="tip-hour">{p.label} - {p.nextLabel}</span>
                              {p.isCurrent ? <span className="tip-tag tip-tag--live">En Vivo</span>
                                : p.esFuturo ? <span className="tip-tag tip-tag--future">Pendiente</span>
                                : p.isPeak ? <span className="tip-tag tip-tag--peak">Pico Máx</span>
                                : null}
                            </div>
                            <div className="tip-body">
                              <div className="tip-val" style={p.val > 0 ? undefined : { color: '#94a3b8' }}>
                                {p.val} <small>tickets</small>
                              </div>
                              <div className="tip-comp">
                                {p.val > 0
                                  ? <>Participación: <b>{hist.total > 0 ? Math.round((p.val / hist.total) * 100) : 0}% del día</b></>
                                  : p.esFuturo ? 'Horario laboral por iniciar' : 'Sin tickets emitidos en este bloque'}
                              </div>
                            </div>
                          </>
                        )
                      }
                    >
                      {/* zona de hover invisible para todo el bloque */}
                      <rect x={Math.round(cx - SLOT / 2)} y={8} width={Math.round(SLOT)} height={BASE_Y - 8} fill="transparent" />
                      {barH > 0 && (
                        <rect
                          x={Math.round(cx - BAR_W / 2)}
                          y={y}
                          width={BAR_W}
                          height={barH}
                          rx={BAR_W / 2}
                          fill={fill}
                          className="histogram-bar"
                        />
                      )}
                      {p.val > 0 && (
                        <text
                          x={cx}
                          y={y - 5}
                          textAnchor="middle"
                          fontSize="8.5"
                          fontWeight="700"
                          fill={p.isPeak ? ROJO : AZUL}
                        >
                          {p.val}
                        </text>
                      )}
                      <text x={cx} y={106} textAnchor="middle" fontSize="7.1" fontWeight={p.isCurrent ? 700 : 500} fill={p.isCurrent ? VIVO : '#64748b'}>
                        {p.label}
                      </text>
                    </g>
                  );
                })}
              </g>
              <g>
                {liveX !== null && (
                  <g className="hist-live-group">
                    <line x1={liveX} y1="14" x2={liveX} y2={BASE_Y} stroke={VIVO} strokeWidth="1.2" strokeDasharray="3,3" />
                    <g transform={`translate(${liveX}, 1)`}>
                      <rect x="-15" y="0" width="30" height="10" rx="5" fill={VIVO} />
                      <text x="0" y="7.3" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#ffffff" letterSpacing="0.4">AHORA</text>
                    </g>
                  </g>
                )}
              </g>
            </svg>
          </div>
        </div>

        {/* REPORTE 2: CURVA DE FLUJO HORARIO */}
        <div className="report-card report-card--chart">
          <header className="report-card__header">
            <div className="report-card__title">
              <LineChart size={14} style={{ color: 'var(--primary)' }} />
              <span>Curva de Flujo Horario ({esDia ? 'Hoy' : 'Mes'})</span>
              {flujo.total > 0 && (
                <span className="chart-live-chip chart-live-chip--flow" style={{ display: 'inline-flex' }}>
                  Total {esDia ? 'Hoy' : 'Mes'}: <b>{flujo.total}</b> t.
                </span>
              )}
            </div>
            <div className="report-card__controls" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="flujo-view-toggle">
                <button type="button" className={`flujo-toggle-btn${esDia ? ' active' : ''}`} onClick={() => cambiarVista('dia')}>
                  <CalendarDays size={12} /><span className="tab-label">Diario</span>
                </button>
                <button type="button" className={`flujo-toggle-btn${!esDia ? ' active' : ''}`} onClick={() => cambiarVista('mes')}>
                  <CalendarDays size={12} /><span className="tab-label">Mes</span>
                </button>
              </div>
              <div className="report-card__legend">
                <span className="legend-chip"><span className="legend-color legend-color--trend" /> {esDia ? 'Flujo Hoy' : 'Flujo Mes'}</span>
              </div>
            </div>
          </header>
          <div className="chart-svg-wrap">
            <svg
              viewBox="0 0 620 120"
              preserveAspectRatio="none"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mx = ((e.clientX - rect.left) / rect.width) * ANCHO;
                let best = 0;
                let min = Infinity;
                flujo.coords.forEach((pt, i) => {
                  const diff = Math.abs(pt[0] - mx);
                  if (diff < min) {
                    min = diff;
                    best = i;
                  }
                });
                const p = flujo.puntos[best];
                setCruce(best);
                mostrarTip(
                  e,
                  <>
                    <div className="tip-header">
                      <span className="tip-hour">{p.label} - {p.nextLabel} ({esDia ? 'Hoy' : 'Mes'})</span>
                      {p.isPeak ? <span className="tip-tag tip-tag--peak">Pico {esDia ? 'Hoy' : 'Mes'}</span>
                        : p.isCurrent ? <span className="tip-tag tip-tag--live">En Vivo</span>
                        : null}
                    </div>
                    <div className="tip-body">
                      <div className="tip-val">{p.flujo} <small>atenciones</small></div>
                      <div className="tip-comp">
                        Tiempo Promedio:{' '}
                        <b>{p.promHora > 0 ? `${p.promHora.toFixed(1)} min` : '—'}</b>
                      </div>
                    </div>
                  </>
                );
              }}
              onMouseLeave={() => {
                setCruce(null);
                setTip(null);
              }}
            >
              <Grid maxVal={flujo.maxFlujo} />
              <path d={flujo.area} fill={AZUL} fillOpacity="0.07" />
              <path d={flujo.d} fill="none" stroke={AZUL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <g>
                {flujo.puntos.map((p, i) => {
                  const [cx, cy] = flujo.coords[i];
                  return (
                    <g key={p.label} className="flow-point">
                      <circle cx={cx} cy={cy} r={p.isPeak ? 3.8 : 2.4} fill={p.isPeak ? ROJO : '#ffffff'} stroke={p.isPeak ? ROJO : AZUL} strokeWidth="1.8" />
                    </g>
                  );
                })}
              </g>
              <g>
                {flujo.puntos.map((p, i) => (
                  <text key={p.label} x={flujo.coords[i][0]} y={106} textAnchor="middle" fontSize="7.1" fontWeight="500" fill="#64748b">
                    {p.label}
                  </text>
                ))}
              </g>
              {cruce !== null && (
                <g>
                  <line x1={flujo.coords[cruce][0]} y1="12" x2={flujo.coords[cruce][0]} y2={BASE_Y} stroke={AZUL} strokeWidth="1" strokeDasharray="3,3" />
                  <circle cx={flujo.coords[cruce][0]} cy={flujo.coords[cruce][1]} r="4" fill="#ffffff" stroke={AZUL} strokeWidth="2" />
                </g>
              )}
            </svg>
          </div>
        </div>
      </section>

      <div
        className={`chart-tooltip${tip ? ' chart-tooltip--visible' : ''}`}
        role="tooltip"
        style={tipEstilo()}
      >
        {tip?.html}
      </div>
    </>
  );
};
