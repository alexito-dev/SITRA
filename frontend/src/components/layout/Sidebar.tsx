import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Globe,
  Landmark,
  MapPin,
  CalendarDays,
  HelpCircle,
  Network,
  Users,
  LogOut,
  ChevronDown,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Sede } from '../../types';
import { api } from '../../api';

interface SidebarProps {
  onOpenReporte: () => void;
  onOpenGuia: () => void;
  onOpenConexiones: () => void;
  onOpenDirectivos: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenReporte,
  onOpenGuia,
  onOpenConexiones,
  onOpenDirectivos,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, isDirectivo, logout } = useAuth();

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [openItis, setOpenItis] = useState<boolean>(false);
  const [busqueda, setBusqueda] = useState<string>('');
  const [sedesCatalogo, setSedesCatalogo] = useState<Sede[]>([]);
  const [sedesFiltradas, setSedesFiltradas] = useState<Sede[]>([]);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.sedes.listar().then((res) => setSedesCatalogo(res.sedes || []));
  }, []);

  useEffect(() => {
    if (!busqueda.trim()) {
      setSedesFiltradas([]);
      return;
    }
    const q = busqueda.trim().toLowerCase();
    const filtradas = sedesCatalogo
      .filter(
        (s) =>
          s.nombre.toLowerCase().includes(q) ||
          s.codigo.toLowerCase().includes(q) ||
          (s.intendencia_nombre && s.intendencia_nombre.toLowerCase().includes(q))
      )
      .slice(0, 8);
    setSedesFiltradas(filtradas);
  }, [busqueda, sedesCatalogo]);

  const esNacional = location.pathname === '/nacional' || location.pathname === '/' || location.pathname === '/comparativo';
  const esIti = location.pathname.startsWith('/intendencia');
  const esCsc = location.pathname.startsWith('/sede') || location.pathname.startsWith('/tv');

  const ITIsPrincipales = [
    { codigo: 'iti_lima', nombre: 'Intendencia Lima', csc: '14 CSC' },
    { codigo: 'iti_junin', nombre: 'ITI Junín', csc: '8 CSC' },
    { codigo: 'iti_arequipa', nombre: 'ITI Arequipa', csc: '6 CSC' },
    { codigo: 'iti_cusco', nombre: 'ITI Cusco', csc: '8 CSC' },
    { codigo: 'iti_lalibertad', nombre: 'ITI La Libertad', csc: '7 CSC' },
    { codigo: 'iti_piura', nombre: 'ITI Piura', csc: '6 CSC' },
  ];

  return (
    <aside
      className="sidebar-sitra"
      style={{
        width: collapsed ? 72 : 260,
        transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-surface, #ffffff)',
        borderRight: '1px solid var(--border-subtle, #e5e7eb)',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Cabecera / Marca */}
      <div
        style={{
          padding: '16px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle, #e5e7eb)',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => navigate('/nacional')}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              backgroundColor: 'var(--primary, #0163ac)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarChart3 size={20} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                SITRA
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Monitoreo Nacional SUNAT
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 6,
          }}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Buscador de Sedes (94 CSCs) */}
      {!collapsed && (
        <div ref={searchBoxRef} style={{ padding: '12px 14px 6px 14px', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar sede (94 CSC)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 30px',
                borderRadius: 6,
                border: '1px solid var(--border-medium, #cbd5e1)',
                fontSize: '0.8rem',
                backgroundColor: 'var(--bg-subtle, #f8fafc)',
              }}
            />
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: 9, top: 9 }} />
          </div>

          {/* Resultados de búsqueda flotante */}
          {sedesFiltradas.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 48,
                left: 14,
                right: 14,
                backgroundColor: '#ffffff',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                zIndex: 50,
                maxHeight: 250,
                overflowY: 'auto',
              }}
            >
              {sedesFiltradas.map((s) => (
                <div
                  key={s.codigo}
                  onClick={() => {
                    navigate(`/sede/${s.codigo}`);
                    setBusqueda('');
                  }}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-light, #f1f5f9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{s.nombre}</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {s.intendencia_nombre || s.intendencia_codigo}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navegación Principal */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
        {/* Sección: Monitoreo */}
        <div style={{ marginBottom: 16 }}>
          {!collapsed && (
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--text-light, #99a1af)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '4px 8px',
              }}
            >
              Monitoreo Operativo
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Nacional */}
            <button
              onClick={() => navigate('/nacional')}
              className={`nav-btn ${esNacional ? 'active' : ''}`}
              title="Monitoreo Nacional"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: 'none',
                background: esNacional ? 'var(--primary-subtle, #e4f3ff)' : 'transparent',
                color: esNacional ? 'var(--primary, #0163ac)' : 'var(--text-main, #1e2939)',
                fontWeight: esNacional ? 700 : 500,
                fontSize: '0.86rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Globe size={18} color={esNacional ? 'var(--primary)' : '#475569'} />
              {!collapsed && (
                <>
                  <span style={{ flex: 1 }}>Nivel Nacional</span>
                  <span className="badge-counter">21 ITI</span>
                </>
              )}
            </button>

            {/* Por Intendencia */}
            <div>
              <button
                onClick={() => setOpenItis(!openItis)}
                className={`nav-btn ${esIti ? 'active' : ''}`}
                title="Por Intendencia"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: esIti ? 'var(--primary-subtle, #e4f3ff)' : 'transparent',
                  color: esIti ? 'var(--primary, #0163ac)' : 'var(--text-main, #1e2939)',
                  fontWeight: esIti ? 700 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Landmark size={18} color={esIti ? 'var(--primary)' : '#475569'} />
                {!collapsed && (
                  <>
                    <span style={{ flex: 1 }}>Por Intendencia</span>
                    <ChevronDown
                      size={14}
                      style={{
                        transform: openItis ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  </>
                )}
              </button>

              {/* Submenú de las 21 ITIs */}
              {!collapsed && openItis && (
                <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                  {ITIsPrincipales.map((it) => (
                    <button
                      key={it.codigo}
                      onClick={() => navigate(`/intendencia/${it.codigo}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background:
                          location.pathname === `/intendencia/${it.codigo}`
                            ? '#f1f5f9'
                            : 'transparent',
                        color:
                          location.pathname === `/intendencia/${it.codigo}`
                            ? 'var(--primary)'
                            : 'var(--text-body)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span>{it.nombre}</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{it.csc}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => navigate('/nacional')}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--primary)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    Ver las 21 ITIs ➔
                  </button>
                </div>
              )}
            </div>

            {/* Tablero por CSC */}
            <button
              onClick={() => navigate('/sede/huancayo')}
              className={`nav-btn ${esCsc ? 'active' : ''}`}
              title="Tablero por CSC"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: 'none',
                background: esCsc ? 'var(--primary-subtle, #e4f3ff)' : 'transparent',
                color: esCsc ? 'var(--primary, #0163ac)' : 'var(--text-main, #1e2939)',
                fontWeight: esCsc ? 700 : 500,
                fontSize: '0.86rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <MapPin size={18} color={esCsc ? 'var(--primary)' : '#475569'} />
              {!collapsed && (
                <>
                  <span style={{ flex: 1 }}>Tablero por CSC</span>
                  <span className="badge-counter">Kiosco TV</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sección: Análisis y Herramientas */}
        <div style={{ marginBottom: 16 }}>
          {!collapsed && (
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--text-light, #99a1af)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '4px 8px',
              }}
            >
              Análisis & Herramientas
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={onOpenReporte}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-main, #1e2939)',
                fontSize: '0.86rem',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              title="Reporte por Día"
            >
              <CalendarDays size={18} color="#10b981" />
              {!collapsed && <span>Reporte por Día</span>}
            </button>

            <button
              onClick={onOpenGuia}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-main, #1e2939)',
                fontSize: '0.86rem',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              title="Guía de Preguntas"
            >
              <HelpCircle size={18} color="#3b82f6" />
              {!collapsed && <span>Guía de Preguntas</span>}
            </button>
          </div>
        </div>

        {/* Sección: Administración */}
        {isDirectivo && (
          <div style={{ marginBottom: 16 }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--text-light, #99a1af)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '4px 8px',
                }}
              >
                Administración
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                onClick={onOpenConexiones}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-main, #1e2939)',
                  fontSize: '0.86rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                title="Conexiones & Red"
              >
                <Network size={18} color="#6366f1" />
                {!collapsed && <span>Conexiones & Red</span>}
              </button>

              {isAdmin && (
                <button
                  onClick={onOpenDirectivos}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-main, #1e2939)',
                    fontSize: '0.86rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  title="Gestión Directivos"
                >
                  <Users size={18} color="#8b5cf6" />
                  {!collapsed && <span>Gestión Directivos</span>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pie de Usuario Institucional */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-subtle, #e5e7eb)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backgroundColor: 'var(--bg-subtle, #f8fafc)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'var(--primary, #0163ac)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.85rem',
            flexShrink: 0,
          }}
          title={user?.nombre || 'Gestor SUNAT'}
        >
          {user?.nombre ? user.nombre.slice(0, 2).toUpperCase() : 'SN'}
        </div>

        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={user?.nombre || 'Gestor'}
            >
              {user?.nombre || 'Gestor'}
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.rol ? user.rol.toUpperCase() : 'INVITADO'}
            </div>
          </div>
        )}

        <button
          onClick={logout}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 6,
          }}
          title="Cerrar sesión institucional"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
