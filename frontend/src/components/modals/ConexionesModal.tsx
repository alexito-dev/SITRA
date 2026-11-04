import React, { useState, useEffect } from 'react';
import { Network, Activity, Plus, RefreshCw, CheckCircle2, XCircle, Edit3, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../api';
import { Sede, Intendencia } from '../../types';

interface ConexionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActualizado?: () => void;
}

export const ConexionesModal: React.FC<ConexionesModalProps> = ({
  isOpen,
  onClose,
  onActualizado,
}) => {
  const [tab, setTab] = useState<'sedes' | 'intendencias'>('sedes');
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [intendencias, setIntendencias] = useState<Intendencia[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [probando, setProbando] = useState<Record<string, boolean>>({});
  const [resultadoTest, setResultadoTest] = useState<Record<string, { estado: string; latencia: number; mensaje: string }>>({});

  // Formulario crear/editar sede
  const [editandoSede, setEditandoSede] = useState<boolean>(false);
  const [sedeForm, setSedeForm] = useState<Partial<Sede>>({
    codigo: '',
    nombre: '',
    intendencia_codigo: 'iti_junin',
    host: '127.0.0.1',
    puerto: 1433,
    instancia: 'SQLEXPRESS',
    base_datos: 'bdtvmediasunat',
    usuario: 'sacolas',
    clave: 'sacolas',
    es_simulado: 0,
  });
  const [esEdicion, setEsEdicion] = useState<boolean>(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resSedes, resInt] = await Promise.all([
        api.sedes.listar(),
        api.intendencias.listar(),
      ]);
      setSedes(resSedes.sedes || []);
      setIntendencias(resInt.intendencias || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen]);

  const probarConexion = async (codigo: string) => {
    setProbando((prev) => ({ ...prev, [codigo]: true }));
    try {
      const res = await api.sedes.probarConexion(codigo);
      setResultadoTest((prev) => ({
        ...prev,
        [codigo]: {
          estado: res.estado,
          latencia: res.latencia_ms,
          mensaje: res.mensaje,
        },
      }));
    } catch (err: any) {
      setResultadoTest((prev) => ({
        ...prev,
        [codigo]: {
          estado: 'error',
          latencia: 0,
          mensaje: err.message,
        },
      }));
    } finally {
      setProbando((prev) => ({ ...prev, [codigo]: false }));
    }
  };

  const toggleModo = async (codigo: string) => {
    try {
      await api.sedes.toggleModo(codigo);
      await cargarDatos();
      if (onActualizado) onActualizado();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const abrirNuevaSede = () => {
    setEsEdicion(false);
    setSedeForm({
      codigo: '',
      nombre: '',
      intendencia_codigo: intendencias[0]?.codigo || 'iti_junin',
      host: '127.0.0.1',
      puerto: 1433,
      instancia: 'SQLEXPRESS',
      base_datos: 'bdtvmediasunat',
      usuario: 'sacolas',
      clave: 'sacolas',
      es_simulado: 0,
    });
    setEditandoSede(true);
  };

  const abrirEditarSede = (s: Sede) => {
    setEsEdicion(true);
    setSedeForm({ ...s });
    setEditandoSede(true);
  };

  const guardarSede = async () => {
    if (!sedeForm.codigo || !sedeForm.nombre || !sedeForm.intendencia_codigo) {
      alert('Código, nombre e intendencia son obligatorios');
      return;
    }
    setLoading(true);
    try {
      if (esEdicion) {
        await api.sedes.actualizar(sedeForm.codigo!, sedeForm);
      } else {
        await api.sedes.crear(sedeForm);
      }
      setEditandoSede(false);
      await cargarDatos();
      if (onActualizado) onActualizado();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const eliminarSede = async (codigo: string) => {
    if (!confirm(`¿Eliminar la sede ${codigo}?`)) return;
    try {
      await api.sedes.eliminar(codigo);
      await cargarDatos();
      if (onActualizado) onActualizado();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión de Conexiones de Red y Sedes SUNAT"
      icon={<Network size={20} className="text-indigo-500" />}
      size="large"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          {tab === 'sedes' && !editandoSede && (
            <button className="btn-primary" onClick={abrirNuevaSede}>
              <Plus size={16} /> Nueva Sede (CSC)
            </button>
          )}
          <button className="btn-secondary" style={{ marginLeft: 'auto' }} onClick={onClose}>
            Cerrar
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Selector de pestañas */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-medium)', gap: 8 }}>
          <button
            onClick={() => { setTab('sedes'); setEditandoSede(false); }}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              color: tab === 'sedes' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === 'sedes' ? '2px solid var(--primary)' : 'none',
            }}
          >
            Centros de Servicios ({sedes.length} CSC)
          </button>
          <button
            onClick={() => { setTab('intendencias'); setEditandoSede(false); }}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              color: tab === 'intendencias' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === 'intendencias' ? '2px solid var(--primary)' : 'none',
            }}
          >
            Intendencias Regionales ({intendencias.length} ITIs)
          </button>
        </div>

        {/* Formulario de creación / edición de Sede */}
        {editandoSede ? (
          <div
            style={{
              padding: 16,
              background: 'var(--bg-subtle)',
              borderRadius: 8,
              border: '1px solid var(--border-medium)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h4 style={{ margin: 0 }}>
              {esEdicion ? `Configurar Conexión: ${sedeForm.nombre}` : 'Registrar Nuevo CSC'}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  CÓDIGO INTERNO
                </label>
                <input
                  type="text"
                  disabled={esEdicion}
                  value={sedeForm.codigo || ''}
                  onChange={(e) => setSedeForm({ ...sedeForm, codigo: e.target.value.toLowerCase().trim() })}
                  placeholder="ej: huancayo, csc_ate"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-medium)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  NOMBRE OFICIAL
                </label>
                <input
                  type="text"
                  value={sedeForm.nombre || ''}
                  onChange={(e) => setSedeForm({ ...sedeForm, nombre: e.target.value })}
                  placeholder="ej: CSC HUANCAYO"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-medium)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  INTENDENCIA PERTENECIENTE
                </label>
                <select
                  value={sedeForm.intendencia_codigo || 'iti_junin'}
                  onChange={(e) => setSedeForm({ ...sedeForm, intendencia_codigo: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-medium)', background: '#fff' }}
                >
                  {intendencias.map((it) => (
                    <option key={it.codigo} value={it.codigo}>
                      {it.nombre} ({it.siglas})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  DIRECCIÓN IP / HOST
                </label>
                <input
                  type="text"
                  value={sedeForm.host || ''}
                  onChange={(e) => setSedeForm({ ...sedeForm, host: e.target.value.trim() })}
                  placeholder="10.51.2.21"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-medium)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  PUERTO TCP
                </label>
                <input
                  type="number"
                  value={sedeForm.puerto || 1433}
                  onChange={(e) => setSedeForm({ ...sedeForm, puerto: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-medium)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  BASE DE DATOS
                </label>
                <input
                  type="text"
                  value={sedeForm.base_datos || 'bdtvmediasunat'}
                  onChange={(e) => setSedeForm({ ...sedeForm, base_datos: e.target.value.trim() })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-medium)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  USUARIO SQL
                </label>
                <input
                  type="text"
                  value={sedeForm.usuario || 'sacolas'}
                  onChange={(e) => setSedeForm({ ...sedeForm, usuario: e.target.value.trim() })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-medium)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  CONTRASEÑA SQL
                </label>
                <input
                  type="password"
                  value={sedeForm.clave || ''}
                  onChange={(e) => setSedeForm({ ...sedeForm, clave: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-medium)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn-secondary" onClick={() => setEditandoSede(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardarSede} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Parámetros'}
              </button>
            </div>
          </div>
        ) : null}

        {/* Contenido pestaña Sedes */}
        {tab === 'sedes' && !editandoSede && (
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Sede</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Intendencia</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Host / Instancia</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Modo</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Diagnóstico Ping</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sedes.map((s, idx) => {
                  const test = resultadoTest[s.codigo];
                  const esSim = s.es_simulado === 1;
                  return (
                    <tr
                      key={s.codigo}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{s.nombre}</td>
                      <td style={{ padding: '8px 12px', color: '#64748b' }}>
                        {s.intendencia_nombre || s.intendencia_codigo}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                        {s.host}:{s.puerto}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleModo(s.codigo)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 9999,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: esSim ? '#fef3c7' : '#ecfdf5',
                            color: esSim ? '#b45309' : '#047857',
                          }}
                          title="Click para alternar entre Real y Simulado"
                        >
                          {esSim ? 'SIMULADO' : 'REAL SQL'}
                        </button>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {test ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                            {test.estado === 'ok' ? (
                              <CheckCircle2 size={14} color="#10b981" />
                            ) : (
                              <XCircle size={14} color="#ef4444" />
                            )}
                            <span style={{ color: test.estado === 'ok' ? '#10b981' : '#ef4444' }}>
                              {test.estado === 'ok' ? `${test.latencia} ms` : 'Sin respuesta'}
                            </span>
                          </div>
                        ) : (
                          <button
                            className="btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                            onClick={() => probarConexion(s.codigo)}
                            disabled={probando[s.codigo]}
                          >
                            <Activity size={12} />
                            {probando[s.codigo] ? 'Probando...' : 'Test Ping'}
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => abrirEditarSede(s)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: 4 }}
                            title="Editar parámetros"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => eliminarSede(s.codigo)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}
                            title="Eliminar sede"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Contenido pestaña Intendencias */}
        {tab === 'intendencias' && (
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Intendencia (ITI)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Región</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Total CSC</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Modo Predeterminado</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Descripción Jurisdiccional</th>
                </tr>
              </thead>
              <tbody>
                {intendencias.map((it, idx) => (
                  <tr
                    key={it.codigo}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: it.color || '#2563eb' }} />
                        <span>{it.nombre}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>{it.region}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                      {it.total_sedes ?? 0}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 9999,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: it.tipo_conexion === 'real' ? '#ecfdf5' : '#fef3c7',
                          color: it.tipo_conexion === 'real' ? '#047857' : '#b45309',
                        }}
                      >
                        {it.tipo_conexion?.toUpperCase() || 'REAL'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '0.75rem' }}>
                      {it.descripcion || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};
