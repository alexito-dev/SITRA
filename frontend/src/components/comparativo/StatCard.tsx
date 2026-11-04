import React from 'react';
import { ChevronRight, Clock, FileText, MapPin, User, Users } from 'lucide-react';
import { Metricas } from '../../utils/metricas';

interface StatCardProps {
  titulo: string;
  /** Etiqueta de ubicación sobre el título (solo tarjetas de CSC) */
  ubicacion?: string;
  metricas: Metricas;
  onClick: () => void;
  onHover?: (activo: boolean) => void;
  resaltada?: boolean;
}

const RADIO = 31;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/** Tarjeta con anillo de % de atención + métricas (ITI o CSC), igual a la del HTML original. */
export const StatCard: React.FC<StatCardProps> = ({ titulo, ubicacion, metricas: m, onClick, onHover, resaltada }) => {
  const color = m.demandaAlta ? '#f59e0b' : '#00b074';
  const fondo = m.demandaAlta ? '#fef0e3' : '#e6f7ef';
  const offset = CIRCUNFERENCIA - (Math.min(100, Math.max(0, m.sla)) / 100) * CIRCUNFERENCIA;

  return (
    <div
      className={`iti-stat-card${resaltada ? ' csc-card-highlighted' : ''}`}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <div className="iti-card-top">
        {ubicacion ? (
          <span className="csc-card-loc-tag">
            <MapPin size={11} />
            <span>{ubicacion}</span>
          </span>
        ) : (
          <span className="iti-card-title">{titulo}</span>
        )}
        <span className={`iti-status-badge ${m.demandaAlta ? 'status--warning' : 'status--online'}`}>
          <span className="status-dot" />
          <span>{m.demandaAlta ? 'Demanda alta' : 'En atención'}</span>
        </span>
      </div>
      {ubicacion && <h3 className="csc-card-title-main">{titulo}</h3>}

      <div className="iti-card-middle">
        <div className="gauge-ring-wrap">
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle className="gauge-bg" cx="38" cy="38" r={RADIO} stroke={fondo} />
            <circle
              className="gauge-bar"
              cx="38"
              cy="38"
              r={RADIO}
              stroke={color}
              strokeDasharray={CIRCUNFERENCIA.toFixed(2)}
              strokeDashoffset={offset.toFixed(2)}
            />
          </svg>
          <div className="gauge-val-wrap">
            <span className="gauge-percent">{m.sla.toFixed(1)}%</span>
            <span className="gauge-label">Atención</span>
          </div>
        </div>
        <div className="iti-metrics-list">
          <div className="iti-metric-row">
            <span className="m-label"><User size={12} className="icon--green" /> En atención</span>
            <span className="m-val">{m.enAtencion.toLocaleString()}</span>
          </div>
          <div className="iti-metric-row">
            <span className="m-label"><Clock size={12} className="icon--amber" /> En cola</span>
            <span className="m-val">{m.enCola.toLocaleString()}</span>
          </div>
          <div className="iti-metric-row">
            <span className="m-label"><Users size={12} className="icon--blue" /> Gestores</span>
            <span className="m-val">{m.agentes.toLocaleString()}</span>
          </div>
          <div className="iti-metric-row">
            <span className="m-label"><FileText size={12} className="icon--blue" /> Tickets</span>
            <span className="m-val">{m.tickets.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="iti-card-bottom">
        <div className="iti-wait-time">
          <Clock size={12} />
          <span>Espera: <strong>{m.esperaMin} min</strong></span>
        </div>
        <div className="iti-arrow-btn">
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  );
};
