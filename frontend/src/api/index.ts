/**
 * Cliente API centralizado para SITRA
 */

import {
  User,
  Intendencia,
  Sede,
  TableroSedeData,
  ComparativoData,
  GuiaPregunta,
  ReporteDiaResponse,
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const config: RequestInit = {
    ...options,
    credentials: 'include', // Necesario para enviar y recibir cookies de sesión (sitra_session)
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    let errorDetail = 'Error en la petición';
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errData.message || JSON.stringify(errData);
    } catch {
      errorDetail = `Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Autenticación
  auth: {
    me: () => request<{ usuario: User; hay_admin_configurado: boolean }>('/auth/me'),
    login: (correo: string, password: string) =>
      request<{ ok: boolean; usuario: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ correo, password }),
      }),
    invitado: () =>
      request<{ ok: boolean; destino: string }>('/auth/invitado', {
        method: 'POST',
      }),
    logout: () =>
      request<{ ok: boolean }>('/auth/logout', {
        method: 'POST',
      }),
    setupAdmin: (correo: string, password: string, nombre?: string) =>
      request<{ ok: boolean; usuario: User }>('/auth/setup-admin', {
        method: 'POST',
        body: JSON.stringify({ correo, password, nombre }),
      }),
  },

  // Gestión de Usuarios (Admin)
  usuarios: {
    listar: () => request<{ usuarios: User[] }>('/usuarios'),
    crear: (data: { nombre: string; correo: string; password: string; rol?: string }) =>
      request<{ ok: boolean; usuario: User }>('/usuarios', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    actualizar: (id: number, data: Partial<User & { password?: string }>) =>
      request<{ ok: boolean; usuario: User }>(`/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    eliminar: (id: number) =>
      request<{ ok: boolean }>(`/usuarios/${id}`, {
        method: 'DELETE',
      }),
  },

  // Intendencias
  intendencias: {
    listar: () => request<{ intendencias: Intendencia[] }>('/intendencias'),
    obtener: (codigo: string) => request<Intendencia>(`/intendencias/${codigo}`),
    crear: (data: Partial<Intendencia>) =>
      request<{ ok: boolean; intendencia: Intendencia }>('/intendencias', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    actualizar: (codigo: string, data: Partial<Intendencia>) =>
      request<{ ok: boolean; intendencia: Intendencia }>(`/intendencias/${codigo}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    eliminar: (codigo: string) =>
      request<{ ok: boolean }>(`/intendencias/${codigo}`, {
        method: 'DELETE',
      }),
  },

  // Sedes (CSC)
  sedes: {
    listar: (intendencia?: string) => {
      const q = intendencia ? `?intendencia=${encodeURIComponent(intendencia)}` : '';
      return request<{ sedes: Sede[] }>(`/sedes${q}`);
    },
    obtener: (codigo: string) => request<Sede>(`/sedes/${codigo}`),
    crear: (data: Partial<Sede>) =>
      request<{ ok: boolean; sede: Sede }>('/sedes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    actualizar: (codigo: string, data: Partial<Sede>) =>
      request<{ ok: boolean; sede: Sede }>(`/sedes/${codigo}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    eliminar: (codigo: string) =>
      request<{ ok: boolean }>(`/sedes/${codigo}`, {
        method: 'DELETE',
      }),
    probarConexion: (codigo: string) =>
      request<{ ok: boolean; estado: string; latencia_ms: number; mensaje: string }>(
        `/sedes/${codigo}/test-conexion`,
        { method: 'POST' }
      ),
    toggleModo: (codigo: string) =>
      request<{ ok: boolean; sede: Sede }>(`/sedes/${codigo}/toggle-modo`, {
        method: 'POST',
      }),
  },

  // Tablero Operativo y Monitoreo
  tablero: {
    obtenerSede: (codigo: string) => request<TableroSedeData>(`/tablero/${codigo}`),
    obtenerConsolidado: () => request<any>('/consolidado'),
    obtenerComparativo: (intendencia?: string) => {
      const q = intendencia ? `?intendencia=${encodeURIComponent(intendencia)}` : '';
      return request<ComparativoData>(`/comparativo${q}`);
    },
  },

  // Reportes Históricos
  reportes: {
    obtenerDia: (sede: string, fecha: string) =>
      request<ReporteDiaResponse>(
        `/reporte/dia?sede=${encodeURIComponent(sede)}&fecha=${encodeURIComponent(fecha)}`
      ),
  },

  // Guía de Trámites y FAQ
  guia: {
    listar: (buscar?: string) => {
      const q = buscar ? `?q=${encodeURIComponent(buscar)}` : '';
      return request<GuiaPregunta[]>(`/guia${q}`);
    },
    crear: (pregunta: string, respuesta: string) =>
      request<GuiaPregunta>('/guia', {
        method: 'POST',
        body: JSON.stringify({ pregunta, respuesta }),
      }),
    actualizar: (id: number, pregunta: string, respuesta: string) =>
      request<GuiaPregunta>(`/guia/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ pregunta, respuesta }),
      }),
    eliminar: (id: number) =>
      request<{ ok: boolean }>(`/guia/${id}`, {
        method: 'DELETE',
      }),
  },
};
