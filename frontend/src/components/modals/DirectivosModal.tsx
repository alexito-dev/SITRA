import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, ShieldAlert, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../api';
import { User } from '../../types';

interface DirectivosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectivosModal: React.FC<DirectivosModalProps> = ({ isOpen, onClose }) => {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editando, setEditando] = useState<boolean>(false);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);

  const [nombre, setNombre] = useState<string>('');
  const [correo, setCorreo] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rol, setRol] = useState<string>('directivo');
  const [activo, setActivo] = useState<number>(1);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const res = await api.usuarios.listar();
      setUsuarios(res.usuarios || []);
    } catch (err: any) {
      alert('Error al listar usuarios: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarUsuarios();
    }
  }, [isOpen]);

  const abrirCrear = () => {
    setUsuarioId(null);
    setNombre('');
    setCorreo('');
    setPassword('');
    setRol('directivo');
    setActivo(1);
    setEditando(true);
  };

  const abrirEditar = (u: User) => {
    setUsuarioId(u.id);
    setNombre(u.nombre);
    setCorreo(u.correo);
    setPassword('');
    setRol(u.rol);
    setActivo(u.activo ?? 1);
    setEditando(true);
  };

  const guardarUsuario = async () => {
    if (!nombre.trim() || !correo.trim()) {
      alert('Nombre y correo son requeridos');
      return;
    }
    if (!usuarioId && !password.trim()) {
      alert('La contraseña es requerida para cuentas nuevas');
      return;
    }

    setLoading(true);
    try {
      if (usuarioId) {
        await api.usuarios.actualizar(usuarioId, {
          nombre,
          correo,
          rol: rol as any,
          activo,
          ...(password ? { password } : {}),
        });
      } else {
        await api.usuarios.crear({
          nombre,
          correo,
          password,
          rol,
        });
      }
      setEditando(false);
      cargarUsuarios();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const eliminarUsuario = async (id: number) => {
    if (!confirm('¿Confirma eliminar este usuario del sistema?')) return;
    try {
      await api.usuarios.eliminar(id);
      cargarUsuarios();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión de Directivos y Accesos SITRA"
      icon={<Users size={20} className="text-purple-500" />}
      size="normal"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          {!editando && (
            <button className="btn-primary" onClick={abrirCrear}>
              <Plus size={16} /> Nuevo Directivo
            </button>
          )}
          <button className="btn-secondary" style={{ marginLeft: 'auto' }} onClick={onClose}>
            Cerrar
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {editando ? (
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
              {usuarioId ? 'Modificar Cuenta Directiva' : 'Registrar Nuevo Directivo'}
            </h4>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                NOMBRE Y APELLIDOS
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Lic. Carlos Mendoza"
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-medium)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                CORREO INSTITUCIONAL
              </label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="cmendoza@sunat.gob.pe"
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-medium)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                CONTRASEÑA {usuarioId && '(Dejar en blanco para no cambiar)'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-medium)' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  ROL DE ACCESO
                </label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-medium)', background: '#fff' }}
                >
                  <option value="directivo">Directivo (Acceso Completo y Reportes)</option>
                  <option value="analista">Analista (Solo Monitoreo)</option>
                  <option value="admin">Administrador (Control Total del Sistema)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  ESTADO
                </label>
                <select
                  value={activo}
                  onChange={(e) => setActivo(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-medium)', background: '#fff' }}
                >
                  <option value={1}>Activo</option>
                  <option value={0}>Inactivo / Deshabilitado</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn-secondary" onClick={() => setEditando(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardarUsuario} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Cuenta'}
              </button>
            </div>
          </div>
        ) : null}

        {!editando && (
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Nombre</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Correo</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Rol</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, i) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{u.nombre}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{u.correo}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 9999,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: u.rol === 'admin' ? '#f3e8ff' : '#e0f2fe',
                          color: u.rol === 'admin' ? '#7e22ce' : '#0369a1',
                        }}
                      >
                        {u.rol.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '0.75rem',
                          color: u.activo ? '#10b981' : '#ef4444',
                        }}
                      >
                        {u.activo ? <Check size={12} /> : <ShieldAlert size={12} />}
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => abrirEditar(u)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: 4 }}
                          title="Editar cuenta"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => eliminarUsuario(u.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}
                          title="Eliminar cuenta"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
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
