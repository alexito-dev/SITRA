import React, { useState, useEffect } from 'react';
import { HelpCircle, Search, Plus, Edit2, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../api';
import { GuiaPregunta } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface GuiaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuiaModal: React.FC<GuiaModalProps> = ({ isOpen, onClose }) => {
  const { isDirectivo } = useAuth();
  const [preguntas, setPreguntas] = useState<GuiaPregunta[]>([]);
  const [busqueda, setBusqueda] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Formulario creación / edición
  const [editando, setEditando] = useState<boolean>(false);
  const [idEdit, setIdEdit] = useState<number | null>(null);
  const [formPregunta, setFormPregunta] = useState<string>('');
  const [formRespuesta, setFormRespuesta] = useState<string>('');

  const cargarPreguntas = async (q = '') => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.guia.listar(q);
      setPreguntas(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar preguntas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarPreguntas(busqueda);
    }
  }, [isOpen]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    cargarPreguntas(busqueda);
  };

  const abrirCrear = () => {
    setIdEdit(null);
    setFormPregunta('');
    setFormRespuesta('');
    setEditando(true);
  };

  const abrirEditar = (p: GuiaPregunta, e: React.MouseEvent) => {
    e.stopPropagation();
    setIdEdit(p.id);
    setFormPregunta(p.pregunta);
    setFormRespuesta(p.respuesta);
    setEditando(true);
  };

  const guardarPregunta = async () => {
    if (!formPregunta.trim() || !formRespuesta.trim()) {
      alert('Pregunta y respuesta son requeridas');
      return;
    }
    setLoading(true);
    try {
      if (idEdit) {
        await api.guia.actualizar(idEdit, formPregunta, formRespuesta);
      } else {
        await api.guia.crear(formPregunta, formRespuesta);
      }
      setEditando(false);
      cargarPreguntas(busqueda);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const eliminarPregunta = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Confirma eliminar esta pregunta frecuente?')) return;
    try {
      await api.guia.eliminar(id);
      cargarPreguntas(busqueda);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guía de Trámites y Preguntas Frecuentes (tvm_preguntas)"
      icon={<HelpCircle size={20} className="text-blue-500" />}
      size="large"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          {isDirectivo && !editando && (
            <button className="btn-primary" onClick={abrirCrear}>
              <Plus size={16} /> Nueva Pregunta
            </button>
          )}
          <button className="btn-secondary" style={{ marginLeft: 'auto' }} onClick={onClose}>
            Cerrar
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Barra de búsqueda */}
        <form onSubmit={handleBuscar} style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Buscar trámite, requisitos, plazos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: 8,
                border: '1px solid var(--border-medium)',
                fontSize: '0.9rem',
              }}
            />
            <Search
              size={18}
              color="#64748b"
              style={{ position: 'absolute', left: 10, top: 10 }}
            />
          </div>
          <button type="submit" className="btn-secondary">
            Buscar
          </button>
        </form>

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

        {/* Modo edición o formulario */}
        {editando ? (
          <div
            style={{
              border: '1px solid var(--border-medium)',
              borderRadius: 8,
              padding: 16,
              backgroundColor: 'var(--bg-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>
              {idEdit ? 'Modificar Pregunta' : 'Registrar Nueva Pregunta en Base de Datos'}
            </h4>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                PREGUNTA / TRÁMITE
              </label>
              <input
                type="text"
                value={formPregunta}
                onChange={(e) => setFormPregunta(e.target.value)}
                placeholder="Ej: ¿Cuáles son los requisitos para reactivar el RUC?"
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 6,
                  border: '1px solid var(--border-medium)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                RESPUESTA / PROCEDIMIENTO
              </label>
              <textarea
                value={formRespuesta}
                onChange={(e) => setFormRespuesta(e.target.value)}
                placeholder="Escriba los pasos y consideraciones para el contribuyente..."
                rows={5}
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 6,
                  border: '1px solid var(--border-medium)',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setEditando(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardarPregunta} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Pregunta'}
              </button>
            </div>
          </div>
        ) : (
          /* Lista de preguntas frecuentes */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Cargando guía...</div>
            ) : preguntas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                No se encontraron preguntas con el criterio de búsqueda.
              </div>
            ) : (
              preguntas.map((p) => {
                const isExpanded = expandedId === p.id;
                return (
                  <div
                    key={p.id}
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor: isExpanded ? 'var(--bg-subtle)' : '#ffffff',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {p.pregunta}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isDirectivo && (
                          <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => abrirEditar(p, e)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#3b82f6',
                                padding: 4,
                              }}
                              title="Editar"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={(e) => eliminarPregunta(p.id, e)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#ef4444',
                                padding: 4,
                              }}
                              title="Eliminar"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                        {isExpanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div
                        style={{
                          padding: '14px 16px',
                          borderTop: '1px solid var(--border-subtle)',
                          fontSize: '0.88rem',
                          color: 'var(--text-body)',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        {p.respuesta}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
