import React, { useState, useEffect } from 'react';
import { Calendar, Download, Search, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../api';
import { Sede, ReporteDiaResponse } from '../../types';
import { mmss, clasificarTicketCategoria } from '../../utils/formatters';

interface ReporteDiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  sedeActual?: string;
}

export const ReporteDiaModal: React.FC<ReporteDiaModalProps> = ({
  isOpen,
  onClose,
  sedeActual = 'huancayo',
}) => {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedSede, setSelectedSede] = useState<string>(sedeActual);
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reporte, setReporte] = useState<ReporteDiaResponse | null>(null);
  const [filtroTexto, setFiltroTexto] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      api.sedes.listar().then((res) => {
        setSedes(res.sedes || []);
        if (sedeActual && res.sedes.some((s) => s.codigo === sedeActual)) {
          setSelectedSede(sedeActual);
        } else if (res.sedes.length > 0) {
          setSelectedSede(res.sedes[0].codigo);
        }
      });
    }
  }, [isOpen, sedeActual]);

  const consultarReporte = async () => {
    if (!selectedSede || !fecha) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.reportes.obtenerDia(selectedSede, fecha);
      setReporte(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener reporte del día');
      setReporte(null);
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    if (!reporte || !reporte.tickets.length) return;
    const encabezados = [
      'Ticket',
      'Categoria',
      'Emision',
      'Llamada',
      'Fin',
      'Espera (seg)',
      'Atencion (seg)',
      'Gestor',
      'Ventanilla',
      'Estado',
    ];

    const filas = reporte.tickets.map((t) => [
      t.num_ticket,
      t.categoria || 'General',
      t.hora_emision || '',
      t.hora_llamada || '',
      t.hora_fin || '',
      t.espera_min ? Math.round(t.espera_min * 60) : 0,
      t.atencion_min ? Math.round(t.atencion_min * 60) : 0,
      `"${t.funcionario || ''}"`,
      t.ventanilla || '',
      t.estado || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [encabezados.join(','), ...filas.map((f) => f.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SITRA_Reporte_${selectedSede}_${fecha}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ticketsFiltrados = (reporte?.tickets || []).filter((t) => {
    if (!filtroTexto.trim()) return true;
    const q = filtroTexto.toLowerCase();
    return (
      t.num_ticket.toLowerCase().includes(q) ||
      (t.funcionario && t.funcionario.toLowerCase().includes(q)) ||
      (t.categoria && t.categoria.toLowerCase().includes(q))
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reporte Operativo por Día (Auditoría SLA)"
      icon={<Calendar size={20} className="text-blue-500" />}
      size="large"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          {reporte && reporte.tickets.length > 0 ? (
            <button className="btn-secondary" onClick={exportarCSV}>
              <Download size={16} /> Exportar CSV
            </button>
          ) : <div />}
          <button className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Barra de filtros */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            backgroundColor: 'var(--bg-subtle)',
            padding: 12,
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              CENTRO DE SERVICIOS
            </label>
            <select
              value={selectedSede}
              onChange={(e) => setSelectedSede(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-medium)',
                background: '#ffffff',
                fontSize: '0.85rem',
              }}
            >
              {sedes.map((s) => (
                <option key={s.codigo} value={s.codigo}>
                  {s.nombre} ({s.codigo})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              FECHA DE ATENCIÓN
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-medium)',
                background: '#ffffff',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <button
            className="btn-primary"
            style={{ alignSelf: 'flex-end', height: 35 }}
            onClick={consultarReporte}
            disabled={loading}
          >
            {loading ? 'Consultando...' : 'Consultar Reporte'}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Resumen KPIs del reporte */}
        {reporte && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 12,
              }}
            >
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>TOTAL TICKETS</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{reporte.total_tickets}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ATENDIDOS</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>
                  {reporte.atendidos}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ABANDONADOS</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>
                  {reporte.abandonados}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ESPERA PROM.</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {mmss(reporte.espera_prom_min * 60)}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>CUMPLIMIENTO SLA</span>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: (reporte.cumplimiento_sla_pct || 0) >= 85 ? '#10b981' : '#f59e0b',
                  }}
                >
                  {reporte.cumplimiento_sla_pct ?? 0}%
                </div>
              </div>
            </div>

            {/* Buscador de tickets en la tabla */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Filtrar por ticket, gestor o categoría..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-medium)',
                  fontSize: '0.85rem',
                }}
              />
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {ticketsFiltrados.length} tickets
              </span>
            </div>

            {/* Tabla de tickets */}
            <div
              style={{
                maxHeight: 350,
                overflowY: 'auto',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ticket</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Categoría</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Emisión</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Espera</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Atención</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Gestor</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ventanilla</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>SLA (&lt;15m)</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                        No se encontraron tickets con los criterios indicados
                      </td>
                    </tr>
                  ) : (
                    ticketsFiltrados.map((t, i) => {
                      const cat = clasificarTicketCategoria(t.num_ticket);
                      const cumpleSla = (t.espera_min || 0) <= 15;
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                          }}
                        >
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{t.num_ticket}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span
                              className={cat.badgeClass}
                              style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem' }}
                            >
                              {cat.nombre}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px' }}>{t.hora_emision}</td>
                          <td style={{ padding: '8px 12px' }}>{mmss((t.espera_min || 0) * 60)}</td>
                          <td style={{ padding: '8px 12px' }}>
                            {t.atencion_min ? mmss(t.atencion_min * 60) : '—'}
                          </td>
                          <td style={{ padding: '8px 12px' }}>{t.funcionario || '—'}</td>
                          <td style={{ padding: '8px 12px' }}>{t.ventanilla || '—'}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: cumpleSla ? '#10b981' : '#ef4444',
                              }}
                              title={cumpleSla ? 'Dentro de meta SLA (<15m)' : 'Excedió meta SLA (>15m)'}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
