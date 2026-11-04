import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Topbar } from '../components/layout/Topbar';
import { HeroKpis } from '../components/comparativo/HeroKpis';
import { ExecCard } from '../components/comparativo/ExecCard';
import { ListaCard } from '../components/comparativo/ListaCard';
import { StatCard } from '../components/comparativo/StatCard';
import { RankingTable } from '../components/comparativo/RankingTable';
import { ItiChoropleth, ItiMapaHandle } from '../components/comparativo/ItiChoropleth';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api';
import { ComparativoData } from '../types';
import { metricasSede } from '../utils/metricas';

export const IntendenciaPage: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const [hoverCsc, setHoverCsc] = useState<string | null>(null);
  const mapaRef = useRef<ItiMapaHandle>(null);

  const { data, loading, refresh } = usePolling<ComparativoData>({
    fetcher: () => api.tablero.obtenerComparativo(codigo),
    intervalMs: 10000,
  });

  const itiActual = data?.intendencias?.[0];
  const sedes = data?.sedes || [];
  const metricas = sedes.map((s) => ({ s, m: metricasSede(s) }));

  const enAtencion = metricas.reduce((a, x) => a + x.m.enAtencion, 0);
  const enCola = metricas.reduce((a, x) => a + x.m.enCola, 0);
  const agentes = metricas.reduce((a, x) => a + x.m.agentes, 0);
  const t = itiActual?.totales;
  const irSede = (cod: string) => navigate(`/sede/${cod}`);
  // Con transición: zoom hacia la CSC y luego abre su tablero
  const entrarSede = (cod: string) => (mapaRef.current ? mapaRef.current.zoomHacia(cod) : irSede(cod));

  return (
    <Layout onRefreshData={refresh}>
      <Topbar title={itiActual ? itiActual.nombre : `Intendencia ${codigo}`} />

      <div className="page-content-scroll">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/nacional')}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <ArrowLeft size={15} />
              <span>Monitoreo Nacional</span>
            </button>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              <span>Nacional</span> /{' '}
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{itiActual?.nombre || codigo}</span>
              {' '}· {sedes.length} CSCs
            </div>
          </div>
        </div>

        <HeroKpis enAtencion={enAtencion} enCola={enCola} agentes={agentes} ambito="en esta ITI" />

        <section className="nacional-main-2col-layout">
          <ExecCard
            titulo={itiActual?.nombre || `Intendencia ${codigo}`}
            subtitulo="Ámbito territorial y Centros de Servicios (CSC)"
            pills={[
              { valor: sedes.length, etiqueta: 'Sedes CSC', color: 'blue' },
              { valor: `${(t?.pct_espera_15m ?? 0).toFixed(1)}%`, etiqueta: 'SLA (<15m)', color: 'green' },
              { valor: t?.en_cola ?? enCola, etiqueta: 'En espera', color: 'amber' },
              { valor: t?.ta_prom ?? '--:--', etiqueta: 'Espera prom', color: 'purple' },
            ]}
          >
            <ItiChoropleth
              ref={mapaRef}
              itiCodigo={codigo}
              sedes={sedes}
              onSelectSede={irSede}
              hoverCodigo={hoverCsc}
              onHoverChange={setHoverCsc}
            />
          </ExecCard>

          <ListaCard titulo="Centros de Servicios por Intendencia" placeholder="Buscar CSC...">
            {(q, modo) => {
              const filtradas = metricas.filter(
                ({ s }) => !q || s.nombre.toLowerCase().includes(q) || s.codigo.toLowerCase().includes(q)
              );
              return modo === 'tabla' ? (
                <RankingTable
                  etiqueta="Centro de Servicios (CSC)"
                  filas={filtradas.map(({ s, m }) => ({ codigo: s.codigo, nombre: s.nombre, metricas: m }))}
                  onSelect={entrarSede}
                />
              ) : (
                <div className="itis-cards-grid">
                  {filtradas.map(({ s, m }) => (
                    <StatCard
                      key={s.codigo}
                      titulo={s.nombre}
                      ubicacion={(s.intendencia_siglas || itiActual?.siglas || 'INTENDENCIA').toUpperCase()}
                      metricas={m}
                      onClick={() => entrarSede(s.codigo)}
                      onHover={(on) => setHoverCsc(on ? s.codigo : null)}
                      resaltada={hoverCsc === s.codigo}
                    />
                  ))}
                  {filtradas.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: '#64748b' }}>
                      No se encontraron Centros de Servicios con "{q}".
                    </div>
                  )}
                </div>
              );
            }}
          </ListaCard>
        </section>
      </div>
    </Layout>
  );
};
