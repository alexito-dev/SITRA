import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Intendencia, Sede } from '../../types';
import { Metricas } from '../../utils/metricas';

export interface FilaTabla {
  codigo: string;
  nombre: string;
  metricas: Metricas;
}

interface RankingTableProps {
  filas: FilaTabla[];
  etiqueta: string;
  onSelect: (codigo: string) => void;
}

export type { Intendencia, Sede };

/** Tabla ejecutiva (modo "Tabla" de la lista de ITIs o CSCs). */
export const RankingTable: React.FC<RankingTableProps> = ({ filas, etiqueta, onSelect }) => (
  <div className="itis-table-container">
    <table className="itis-table-modern">
      <thead>
        <tr>
          <th style={{ textAlign: 'left' }}>{etiqueta}</th>
          <th className="text-center">Estado</th>
          <th className="text-center">% Atención</th>
          <th className="text-center">En atención</th>
          <th className="text-center">En cola</th>
          <th className="text-center">Gestores</th>
          <th className="text-center">Tickets hoy</th>
          <th className="text-center">T. espera prom.</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {filas.length === 0 && (
          <tr>
            <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
              No hay resultados para la búsqueda
            </td>
          </tr>
        )}
        {filas.map((f) => (
          <tr key={f.codigo} onClick={() => onSelect(f.codigo)} style={{ cursor: 'pointer' }}>
            <td style={{ fontWeight: 700 }}>{f.nombre}</td>
            <td className="text-center">
              <span className={`iti-status-badge ${f.metricas.demandaAlta ? 'status--warning' : 'status--online'}`}>
                <span className="status-dot" />
                <span>{f.metricas.demandaAlta ? 'Demanda alta' : 'En atención'}</span>
              </span>
            </td>
            <td className="text-center num-cell">{f.metricas.sla.toFixed(1)}%</td>
            <td className="text-center num-cell">{f.metricas.enAtencion}</td>
            <td className="text-center num-cell">{f.metricas.enCola}</td>
            <td className="text-center num-cell">{f.metricas.agentes}</td>
            <td className="text-center num-cell">{f.metricas.tickets.toLocaleString()}</td>
            <td className="text-center">{f.metricas.esperaMin} min</td>
            <td>
              <ChevronRight size={16} color="#94a3b8" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
