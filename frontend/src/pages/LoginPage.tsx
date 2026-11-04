import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginGuest, setupAdmin } = useAuth();

  const [correo, setCorreo] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showSetup, setShowSetup] = useState<boolean>(false);

  // Setup admin
  const [setupCorreo, setSetupCorreo] = useState<string>('admin@sunat.gob.pe');
  const [setupPass, setSetupPass] = useState<string>('');
  const [setupNombre, setSetupNombre] = useState<string>('Administrador SITRA');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo.trim() || !password.trim()) {
      setError('Por favor ingrese su correo y contraseña institucional.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(correo, password);
      navigate('/nacional');
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitado = async () => {
    setLoading(true);
    try {
      await loginGuest();
      navigate('/nacional');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupCorreo || !setupPass) return;
    setLoading(true);
    try {
      await setupAdmin(setupCorreo, setupPass, setupNombre);
      navigate('/nacional');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0f172a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Fondo con resplandor sutil */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(1, 99, 172, 0.25) 0%, rgba(15, 23, 42, 0) 70%)',
          top: '20%',
          left: '30%',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#1e293b',
          borderRadius: 16,
          border: '1px solid #334155',
          padding: 32,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Cabecera / Marca */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              backgroundColor: '#0163ac',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 10px 15px -3px rgba(1, 99, 172, 0.4)',
            }}
          >
            <BarChart3 size={28} />
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.45rem', fontWeight: 800 }}>
              SITRA
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
              Sistema Integral de Tiempos de Atención • SUNAT
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: 10,
              borderRadius: 8,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              CORREO INSTITUCIONAL
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="usuario@sunat.gob.pe"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 8,
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '0.88rem',
                }}
              />
              <Mail size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: 13 }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              CONTRASEÑA
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 8,
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '0.88rem',
                }}
              />
              <Lock size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: 13 }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: 12,
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#0163ac',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background-color 0.15s ease',
              marginTop: 4,
            }}
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: '#334155' }} />
          <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>O</span>
          <div style={{ flex: 1, height: 1, backgroundColor: '#334155' }} />
        </div>

        {/* Modo Invitado */}
        <button
          onClick={handleInvitado}
          disabled={loading}
          style={{
            padding: 10,
            borderRadius: 8,
            border: '1px solid #334155',
            backgroundColor: 'transparent',
            color: '#cbd5e1',
            fontWeight: 600,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <ShieldCheck size={16} color="#38bdf8" />
          <span>Acceder como Invitado (Modo Lectura)</span>
        </button>

        {/* Configuración Inicial Admin */}
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <button
            onClick={() => setShowSetup(!showSetup)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '0.75rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {showSetup ? 'Ocultar configuración de Administrador' : '¿Reconfigurar Cuenta de Administrador?'}
          </button>
        </div>

        {showSetup && (
          <form
            onSubmit={handleSetupAdmin}
            style={{
              padding: 14,
              borderRadius: 8,
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>
              Configurar Administrador Principal
            </span>
            <input
              type="text"
              placeholder="Nombre del Admin"
              value={setupNombre}
              onChange={(e) => setSetupNombre(e.target.value)}
              style={{ padding: 6, borderRadius: 4, background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
            />
            <input
              type="email"
              placeholder="admin@sunat.gob.pe"
              value={setupCorreo}
              onChange={(e) => setSetupCorreo(e.target.value)}
              style={{ padding: 6, borderRadius: 4, background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
            />
            <input
              type="password"
              placeholder="Nueva Contraseña Maestra"
              value={setupPass}
              onChange={(e) => setSetupPass(e.target.value)}
              style={{ padding: 6, borderRadius: 4, background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.78rem', justifyContent: 'center' }}
            >
              Guardar Administrador
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
