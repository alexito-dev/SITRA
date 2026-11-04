import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  Headset,
  HourglassIcon,
  PieChart,
  Pause,
  Phone,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Topbar } from '../components/layout/Topbar';
import { TableroCharts } from '../components/tablero/TableroCharts';
import { clasificarTicket, minutosStr, mmss, nivelDe, Nivel } from '../components/tablero/helpers';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api';
import { ProduccionTipo, Sede, SubtipoProduccion, TableroSedeData, TicketTablero } from '../types';

const Bsc: React.FC<{ nivel: Nivel }> = ({ nivel }) => (
  <td className="col-bsc">
    <span className={`bsc-dot bsc-dot--${nivel}`} title={`Nivel BSC: ${nivel.toUpperCase()}`} />
  </td>
);

const CeldaTicket: React.FC<{ ticket?: string }> = ({ ticket }) => {
  const texto = (ticket || '').trim();
  const cat = clasificarTicket(texto);
  return (
    <td className={`ticket-cell ${cat.clase}`} title={texto ? `Ticket ${texto} (${cat.nombre})` : undefined}>
      <span className={`ticket-pill ${cat.pillClase}`}>{texto || '—'}</span>
    </td>
  );
};

const SUB_VACIO: SubtipoProduccion = { atenciones: 0, prom_minutos: '00', nivel: 'verde' };
const TIPOS_BASE = ['Orientación', 'Trámite', 'Mesa de Partes', 'Cabinas'];

export const CscTableroPage: React.FC = () => {
  const { codigo = 'huancayo' } = useParams<{ codigo: string }>();
  const navigate = useNavigate();

  const [sedesHermanas, setSedesHermanas] = useState<Sede[]>([]);
  const [estados, setEstados] = useState<Record<string, boolean>>({});
  const [desfase, setDesfase] = useState<number>(0); // segundos desde la última lectura
  const [ahora, setAhora] = useState<Date>(new Date());

  const { data, refresh } = usePolling<TableroSedeData>({
    fetcher: () => api.tablero.obtenerSede(codigo),
    intervalMs: 10000,
  });

  useEffect(() => {
    api.sedes.listar().then((res) => setSedesHermanas(res.sedes || []));
  }, [codigo]);

  // Estado de conexión de cada CSC (punto verde / rojo del selector)
  useEffect(() => {
    const cargar = () =>
      api.tablero
        .obtenerConsolidado()
        .then((c) => {
          const mapa: Record<string, boolean> = {};
          (c.sedes || []).forEach((s: { codigo: string; conectado: boolean }) => {
            mapa[s.codigo] = Boolean(s.conectado);
          });
          setEstados(mapa);
        })
        .catch(() => undefined);
    cargar();
    const id = setInterval(cargar, 15000);
    return () => clearInterval(id);
  }, []);

  // Cada lectura nueva reinicia el desfase
  useEffect(() => {
    setDesfase(0);
  }, [data]);

  // Cronómetros y reloj en tiempo real (cada segundo)
  useEffect(() => {
    const id = setInterval(() => {
      setDesfase((d) => d + 1);
      setAhora(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const espera = data?.espera || [];
  const atencion = data?.atencion || [];
  const suspension = data?.suspension || [];
  const produccion = data?.produccion || [];
  const res = data?.resumen || {};

  const pct = res.pct_espera_15m ?? 100;
  const pctAlerta = res.pct_espera_alerta || pct < 90;
  const taClase = res.ta_prom_nivel === 'rojo' ? 'text-danger' : res.ta_prom_nivel === 'ambar' ? 'text-warning' : 'text-success';

  // Producción por tipo: categorías base si la API no trae nada (igual que el original)
  const tipos: ProduccionTipo[] =
    data?.produccion_tipo && data.produccion_tipo.length > 0
      ? data.produccion_tipo
      : TIPOS_BASE.map((categoria) => ({ categoria, ...SUB_VACIO }));
  const totalPorTipo = tipos.reduce((a, t) => a + (t.atenciones || 0), 0);

  const filaTicket = (t: TicketTablero, i: number, tipo: 'espera' | 'atencion', conGestor: boolean) => {
    const seg = t.segundos + desfase;
    return (
      <tr key={`${tipo}-${i}`}>
        <CeldaTicket ticket={t.ticket} />
        <td className="num-min">{minutosStr(seg)}</td>
        {conGestor && (
          <td className="gestor-nom" title={t.gestor}>
            {t.gestor ? (t.ventanilla ? `${t.gestor} (V.${t.ventanilla})` : t.gestor) : '—'}
          </td>
        )}
        <td className="contri-nom" title={t.cliente || t.ruc}>{t.cliente || t.ruc || '—'}</td>
        <Bsc nivel={nivelDe(tipo, seg)} />
      </tr>
    );
  };

  const subFila = (nombre: string, s: SubtipoProduccion | undefined) => {
    const v = s || SUB_VACIO;
    return (
      <tr className="row-subtipo" key={nombre}>
        <td className="tipo-sub-nom">{nombre}</td>
        <td className="num-atenc">{v.atenciones ?? 0}</td>
        <td className="num-prom">{v.prom_minutos || '00'}</td>
        <Bsc nivel={v.atenciones > 0 ? v.nivel : 'verde'} />
      </tr>
    );
  };

  return (
    <Layout activeSede={codigo} onRefreshData={refresh}>
      <Topbar
        sedeActual={codigo}
        sedeNombre={data?.sede || 'CSC'}
        sedesHermanas={sedesHermanas.filter(
          (x) => !data?.intendencia_codigo || x.intendencia_codigo === data.intendencia_codigo
        )}
        estados={estados}
        onSelectSede={(cod) => navigate(`/sede/${cod}`)}
        online={data?.conectado ?? true}
      />

      <div className="workspace tablero-entrada" style={{ padding: 12, overflow: 'hidden' }}>
        {/* COLUMNA 1: ESTADO OPERATIVO */}
        <aside className="sidebar" aria-label="Estado operativo">
          <div className="sidebar__label sidebar__label--live">
            <span className="sidebar__label-text">
              <PieChart size={13} style={{ color: '#3b82f6' }} /> Estado Operativo
            </span>
            <span className="kpi-live-chip"><span className="kpi-pulse-dot" />En Vivo</span>
          </div>

          <div className="sidebar-kpis">
            <div className="kpi-hero-vibrant">
              <div className="kpi-hero-vibrant__badge"><Phone size={18} /></div>
              <div className="kpi-hero-vibrant__info">
                <span className="kpi-hero-vibrant__label">Active Calls</span>
                <div className="kpi-hero-vibrant__val-row">
                  <span className="kpi-hero-vibrant__value">{res.llamadas_activas ?? espera.length + atencion.length}</span>
                  <span className="kpi-hero-vibrant__sub">en curso</span>
                </div>
              </div>
            </div>

            <div className="kpi-vibrant-grid">
              <div className="kpi-vibrant-box kpi-vibrant-box--cola" title="Llamadas o tickets en espera de ser atendidos">
                <div className="kpi-vibrant-box__top">
                  <span className="kpi-vibrant-badge kpi-vibrant-badge--cola"><Clock size={13} /></span>
                  <span className="kpi-vibrant-label">En Cola</span>
                </div>
                <span className="kpi-vibrant-value kpi-vibrant-value--cola">{res.en_cola ?? espera.length}</span>
              </div>

              <div className="kpi-vibrant-box kpi-vibrant-box--atencion" title="Tickets actualmente atendidos en ventanilla">
                <div className="kpi-vibrant-box__top">
                  <span className="kpi-vibrant-badge kpi-vibrant-badge--atencion"><Headset size={13} /></span>
                  <span className="kpi-vibrant-label">En Atención</span>
                </div>
                <span className="kpi-vibrant-value kpi-vibrant-value--atencion">{res.en_atencion ?? atencion.length}</span>
              </div>

              <div className="kpi-vibrant-box kpi-vibrant-box--susp" title="Tickets temporalmente suspendidos">
                <div className="kpi-vibrant-box__top">
                  <span className="kpi-vibrant-badge kpi-vibrant-badge--susp"><Pause size={13} /></span>
                  <span className="kpi-vibrant-label">Suspendidos</span>
                </div>
                <span className="kpi-vibrant-value kpi-vibrant-value--susp">{res.suspendidos ?? suspension.length}</span>
              </div>

              <div className="kpi-vibrant-box kpi-vibrant-box--espera" title="Tiempo de espera máximo del ticket actual en cola">
                <div className="kpi-vibrant-box__top">
                  <span className="kpi-vibrant-badge kpi-vibrant-badge--espera"><HourglassIcon size={13} /></span>
                  <span className="kpi-vibrant-label">Espera Máx</span>
                </div>
                <span className="kpi-vibrant-value kpi-vibrant-value--espera">{res.espera_max || '00:00'}</span>
              </div>

              <div
                className={`kpi-vibrant-box kpi-vibrant-box--bsc${pctAlerta ? ' kpi-mini-box--alert' : ''}`}
                title="Porcentaje de tickets con espera <= 15 minutos (Meta institucional: >= 90%)."
              >
                <div className="kpi-vibrant-box__top">
                  <span className="kpi-vibrant-badge kpi-vibrant-badge--bsc"><ShieldCheck size={13} /></span>
                  <span className="kpi-vibrant-label">% &lt; 15 min</span>
                </div>
                <span className={`kpi-vibrant-value kpi-vibrant-value--bsc ${pctAlerta ? 'text-danger' : 'text-success'}`}>{pct}%</span>
              </div>

              <div className="kpi-vibrant-box kpi-vibrant-box--ta" title="Tiempo de atención promedio global del día (Meta BSC <= 8 min)">
                <div className="kpi-vibrant-box__top">
                  <span className="kpi-vibrant-badge kpi-vibrant-badge--ta"><Timer size={13} /></span>
                  <span className="kpi-vibrant-label">TA Prom.</span>
                </div>
                <span className={`kpi-vibrant-value kpi-vibrant-value--ta ${taClase}`}>{res.ta_prom || '00:00'}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* COLUMNA 2: TABLERO OPERATIVO */}
        <main className="main-stage">
          <TableroCharts
            demanda={data?.demanda || []}
            flujoDia={data?.flujo_dia || []}
            flujoMes={data?.flujo_mes || []}
            ahora={ahora}
          />

          <section className="tables-grid">
            {/* 1. TIEMPO ESPERA */}
            <div className="table-card">
              <header className="table-card__header">
                <div className="table-card__title">
                  <span className="table-tag table-tag--blue" />
                  <h2>Tiempo de Espera</h2>
                </div>
                <span className="count-pill">{espera.length}</span>
              </header>
              <div className="table-wrap tabla-scroll">
                <table>
                  <thead>
                    <tr><th>Ticket</th><th>Minutos</th><th>Contribuyente</th><th className="col-bsc">BSC</th></tr>
                  </thead>
                  <tbody>{espera.map((t, i) => filaTicket(t, i, 'espera', false))}</tbody>
                </table>
                {espera.length === 0 && <div className="empty-state">Sin tickets en espera</div>}
              </div>
            </div>

            {/* 2. TIEMPO ATENCIÓN */}
            <div className="table-card">
              <header className="table-card__header">
                <div className="table-card__title">
                  <span className="table-tag table-tag--indigo" />
                  <h2>Tiempo de Atención</h2>
                </div>
                <span className="count-pill">{atencion.length}</span>
              </header>
              <div className="table-wrap tabla-scroll">
                <table>
                  <thead>
                    <tr><th>Ticket</th><th>Minutos</th><th>Gestor</th><th>Contribuyente</th><th className="col-bsc">BSC</th></tr>
                  </thead>
                  <tbody>{atencion.map((t, i) => filaTicket(t, i, 'atencion', true))}</tbody>
                </table>
                {atencion.length === 0 && <div className="empty-state">No hay atenciones en curso</div>}
              </div>
            </div>

            {/* 3. PRODUCCIÓN */}
            <div className="tables-col-stack">
              <div className="table-card">
                <header className="table-card__header">
                  <div className="table-card__title">
                    <span className="table-tag table-tag--green" />
                    <h2>Producción</h2>
                  </div>
                  <span className="count-pill">{produccion.length}</span>
                </header>
                <div className="table-wrap tabla-scroll">
                  <table>
                    <thead>
                      <tr><th>Gestor</th><th className="text-right">Atenc.</th><th className="text-right">Prom.</th><th className="col-bsc">BSC</th></tr>
                    </thead>
                    <tbody>
                      {produccion.map((p, i) => (
                        <tr key={i}>
                          <td className="gestor-nom" title={p.gestor}>{p.gestor || 'Gestor'}</td>
                          <td className="num-atenc">{p.atenciones}</td>
                          <td className="num-prom">{p.prom_minutos || minutosStr(p.prom_segundos ?? 0)}</td>
                          <Bsc nivel={p.nivel} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {produccion.length === 0 && <div className="empty-state">Sin atenciones concluidas hoy</div>}
                </div>
              </div>

              <div className="table-card table-card--tipo">
                <header className="table-card__header">
                  <div className="table-card__title">
                    <span className="table-tag table-tag--teal" />
                    <h2>Producción por Tipo</h2>
                  </div>
                  <span className="count-pill">{totalPorTipo}</span>
                </header>
                <div className="table-wrap tabla-scroll">
                  <table className="table-produccion-tipo">
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th className="text-right">Atenciones</th>
                        <th className="text-right" title="En Tiempo de Atención">En TA</th>
                        <th className="col-bsc">BSC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tipos.map((t) => (
                        <React.Fragment key={t.categoria}>
                          <tr className="row-cat-header">
                            <td className="tipo-cat-nom">{t.categoria}</td>
                            <td className="num-atenc">{t.atenciones ?? 0}</td>
                            <td className="num-prom">{t.prom_minutos || '00'}</td>
                            <Bsc nivel={t.atenciones > 0 ? t.nivel : 'verde'} />
                          </tr>
                          {subFila('General', t.general)}
                          {(t.categoria !== 'Mesa de Partes' || (t.preferencial?.atenciones ?? 0) > 0) &&
                            subFila('Preferencial', t.preferencial)}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* VENTANILLAS SUSPENDIDAS */}
          <details
            className={`suspension-box tarjeta-suspension-wrap${suspension.length > 0 ? ' suspension-box--activa' : ''}`}
            open={suspension.length > 0}
          >
            <summary className="suspension-box__summary">
              <div className="suspension-box__title">
                <span className="status-dot status-dot--amber" />
                <span>Ventanillas Suspendidas</span>
                <span className="count-pill count-pill--subtle">{suspension.length}</span>
              </div>
              <span className="suspension-box__hint">Clic para ver detalle ▼</span>
            </summary>
            <div className="table-wrap tabla-scroll tabla-scroll--susp">
              <table>
                <thead>
                  <tr>
                    <th>Gestor</th><th>Motivo de Suspensión</th><th>Hora Inicio</th>
                    <th>Tiempo Transcurrido</th><th className="col-bsc">BSC</th>
                  </tr>
                </thead>
                <tbody>
                  {suspension.map((s, i) => {
                    const seg = s.segundos + desfase;
                    return (
                      <tr key={i}>
                        <td>{s.gestor}</td>
                        <td>{s.motivo}</td>
                        <td>{s.hora}</td>
                        <td>{mmss(seg)}</td>
                        <Bsc nivel={nivelDe('suspension', seg)} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {suspension.length === 0 && <div className="empty-state">Todas las ventanillas están activas</div>}
            </div>
          </details>

          {data && !data.conectado && (
            <div className="alerta-error">
              Aviso: No se pudo comunicar con el SQL Server de esta sede ({data.error || 'tiempo de espera agotado'}).
              Mostrando última lectura conocida.
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
};
