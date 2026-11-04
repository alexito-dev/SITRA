import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Topbar } from '../components/layout/Topbar';
import { HeroKpis } from '../components/comparativo/HeroKpis';
import { ExecCard } from '../components/comparativo/ExecCard';
import { ListaCard } from '../components/comparativo/ListaCard';
import { StatCard } from '../components/comparativo/StatCard';
import { RankingTable } from '../components/comparativo/RankingTable';
import { PeruChoropleth } from '../components/comparativo/PeruChoropleth';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api';
import { ComparativoData } from '../types';
import { metricasIti, tituloIti } from '../utils/metricas';

export const NacionalPage: React.FC = () => {
  const navigate = useNavigate();

  const { data, loading, refresh } = usePolling<ComparativoData>({
    fetcher: () => api.tablero.obtenerComparativo(),
    intervalMs: 10000,
  });

  const intendencias = data?.intendencias || [];
  const tot = data?.totales_regionales;
  const metricas = intendencias.map((it) => ({ it, m: metricasIti(it) }));

  const enAtencion = tot?.en_atencion ?? 0;
  const enCola = tot?.en_cola ?? 0;
  const agentes = metricas.reduce((acc, x) => acc + x.m.agentes, 0);
  const itisEnMeta = metricas.filter((x) => x.m.sla >= 90).length;
  const irIti = (cod: string) => navigate(`/intendencia/${cod}`);

  return (
    <Layout onRefreshData={refresh}>
      <Topbar title="Monitoreo Nacional" />

      <div className="page-content-scroll">
        <HeroKpis enAtencion={enAtencion} enCola={enCola} agentes={agentes} ambito="en todas las ITI" />

        <section className="nacional-main-2col-layout">
          <ExecCard
            titulo="Monitoreo Nacional"
            subtitulo="Estado de atención por ITI"
            pills={[
              { valor: itisEnMeta, etiqueta: 'ITI en meta', color: 'green' },
              { valor: metricas.length - itisEnMeta, etiqueta: 'Alta demanda', color: 'amber' },
              { valor: tot?.sedes_total ?? 0, etiqueta: 'Sedes CSC', color: 'blue' },
              { valor: tot?.ta_prom ?? '--:--', etiqueta: 'Espera promedio', color: 'purple' },
            ]}
          >
            <PeruChoropleth intendencias={intendencias} onSelectIti={irIti} />
          </ExecCard>

          <ListaCard titulo="Lista de Intendencias Tributarias (ITI)" placeholder="Buscar ITI...">
            {(q, modo) => {
              const filtradas = metricas.filter(
                ({ it }) =>
                  !q ||
                  it.nombre.toLowerCase().includes(q) ||
                  it.codigo.toLowerCase().includes(q) ||
                  (it.region || '').toLowerCase().includes(q) ||
                  (it.siglas || '').toLowerCase().includes(q)
              );
              return modo === 'tabla' ? (
                <RankingTable
                  etiqueta="Intendencia Tributaria (ITI)"
                  filas={filtradas.map(({ it, m }) => ({ codigo: it.codigo, nombre: tituloIti(it), metricas: m }))}
                  onSelect={irIti}
                />
              ) : (
                <div className="itis-cards-grid">
                  {filtradas.map(({ it, m }) => (
                    <StatCard key={it.codigo} titulo={tituloIti(it)} metricas={m} onClick={() => irIti(it.codigo)} />
                  ))}
                  {filtradas.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: '#64748b' }}>
                      No se encontraron Intendencias con "{q}".
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
