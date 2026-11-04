import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check, Search } from 'lucide-react';
import { useClock } from '../../hooks/useClock';
import { Sede } from '../../types';

interface TopbarProps {
  title?: string;
  sedeActual?: string;
  sedeNombre?: string;
  sedesHermanas?: Sede[];
  onSelectSede?: (codigo: string) => void;
  online?: boolean;
  /** Estado de conexión por código de sede (de /api/consolidado) */
  estados?: Record<string, boolean>;
}

export const Topbar: React.FC<TopbarProps> = ({
  title = 'Monitoreo Nacional',
  sedeActual,
  sedeNombre,
  sedesHermanas,
  onSelectSede,
  online = true,
  estados,
}) => {
  const clock = useClock();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [filtro, setFiltro] = useState<string>('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const sedesFiltradas = (sedesHermanas || [])
    .filter((s) => s.nombre.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return (
    <header className="topbar-minimal">
      {/* Título o Selector de Sede */}
      {sedesHermanas && sedesHermanas.length > 0 && onSelectSede ? (
        <div className={`csc-selector-wrapper${dropdownOpen ? ' is-open' : ''}`} ref={popoverRef}>
          <button
            type="button"
            className="csc-selector-btn"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Cambiar Centro de Servicios (CSC)"
          >
            <span className="csc-selector-btn__text">{sedeNombre || 'Seleccionar CSC'}</span>
            <ChevronDown size={16} className="csc-selector-btn__chevron" />
          </button>

          {dropdownOpen && (
            <div className="csc-popover" style={{ display: 'block' }}>
              <div className="csc-search-box">
                <Search size={14} className="csc-search-icon" />
                <input
                  type="text"
                  className="csc-search-input"
                  placeholder="Buscar CSC..."
                  autoComplete="off"
                  autoFocus
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </div>

              <div className="csc-popover-list">
                {sedesFiltradas.map((s) => {
                  const esActivo = s.codigo === sedeActual;
                  const enLinea = esActivo ? online : Boolean(estados?.[s.codigo]);
                  return (
                    <a
                      key={s.codigo}
                      href={`/sede/${s.codigo}`}
                      className={`csc-popover-item${esActivo ? ' csc-popover-item--active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onSelectSede(s.codigo);
                        setDropdownOpen(false);
                        setFiltro('');
                      }}
                    >
                      <div className="csc-item-left">
                        <span className={`csc-status-dot ${enLinea ? 'csc-status-dot--live' : 'csc-status-dot--offline'}`} />
                        <span className="csc-item-name">{s.nombre}</span>
                      </div>
                      <div className="csc-item-right">
                        <span className={`csc-status-badge ${enLinea ? 'csc-status-badge--live' : 'csc-status-badge--offline'}`}>
                          {enLinea ? 'En vivo' : 'Sin conexión'}
                        </span>
                        {esActivo && <Check size={16} className="csc-check-icon" strokeWidth={3} />}
                      </div>
                    </a>
                  );
                })}
              </div>

              {sedesFiltradas.length === 0 && <div className="csc-empty-state">No se encontraron sedes</div>}

              <div className="csc-popover-footer">
                <span className="csc-count-label">{(sedesHermanas || []).length} CSC disponibles</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <h1 className="topbar-minimal__title">{title}</h1>
      )}

      {/* Reloj y Estado */}
      <div className="topbar-minimal__meta">
        <span className="meta-clock" title="Hora Oficial del Sistema">
          <Clock size={16} />
          <span className="sitra-live-clock">{clock}</span>
        </span>
        <span className="meta-divider" />
        <div className="meta-status-pill">
          <span
            className="meta-dot"
            style={{ backgroundColor: online ? '#10b981' : '#ef4444' }}
          />
          <span>{online ? 'En línea' : 'Sin conexión'}</span>
        </div>
      </div>
    </header>
  );
};
