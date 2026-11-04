import React from 'react';

export interface ExecPill {
  valor: React.ReactNode;
  etiqueta: string;
  color: 'green' | 'amber' | 'blue' | 'purple';
}

interface ExecCardProps {
  titulo: string;
  subtitulo: string;
  pills: ExecPill[];
  children: React.ReactNode;
}

/** Tarjeta ejecutiva de la columna izquierda: título + 4 mini KPIs + mapa/ranking. */
export const ExecCard: React.FC<ExecCardProps> = ({ titulo, subtitulo, pills, children }) => (
  <div className="nacional-left-col-sticky">
    <div className="card-nacional-exec">
      <div className="card-nacional-exec-header">
        <div className="exec-header-text">
          <h3 className="exec-header-title">{titulo}</h3>
          <p className="exec-header-sub">{subtitulo}</p>
        </div>
        <div className="exec-header-kpis">
          {pills.map((p) => (
            <div key={p.etiqueta} className={`exec-kpi-pill kpi-pill--${p.color}`}>
              <span className={`exec-kpi-num text-${p.color}`}>{p.valor}</span>
              <span className="exec-kpi-label">{p.etiqueta}</span>
            </div>
          ))}
        </div>
      </div>
      {children}
    </div>
  </div>
);
