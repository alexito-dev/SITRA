/**
 * Utilidades de formato y cálculo de semáforo SLA para SITRA
 */

export function mmss(segundos: number | null | undefined): string {
  if (segundos === null || segundos === undefined || isNaN(segundos)) {
    return '--:--';
  }
  const s = Math.max(0, Math.round(segundos));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function minutosStr(segundos: number | null | undefined): string {
  if (segundos === null || segundos === undefined || isNaN(segundos)) {
    return '--';
  }
  const s = Math.max(0, Math.round(segundos));
  return String(Math.floor(s / 60));
}

export function obtenerNivelEspera(segundos: number): 'verde' | 'ambar' | 'rojo' {
  const min = segundos / 60;
  if (min > 15) return 'rojo';
  if (min >= 12) return 'ambar';
  return 'verde';
}

export function obtenerNivelAtencion(segundos: number): 'verde' | 'ambar' | 'rojo' {
  const min = segundos / 60;
  if (min > 8) return 'rojo';
  if (min >= 5) return 'ambar';
  return 'verde';
}

export function obtenerNivelSLA(porcentaje: number): 'verde' | 'ambar' | 'rojo' {
  if (porcentaje >= 85) return 'verde';
  if (porcentaje >= 70) return 'ambar';
  return 'rojo';
}

export interface CategoriaTicketInfo {
  id: string;
  nombre: string;
  badgeClass: string;
  dotColor: string;
}

export function clasificarTicketCategoria(ticketStr: string): CategoriaTicketInfo {
  const s = (ticketStr || '').toUpperCase().trim();
  if (s.startsWith('MP') || s.startsWith('M')) {
    return {
      id: 'mesa',
      nombre: 'Mesa de Partes',
      badgeClass: 'badge-cat-mesa',
      dotColor: '#a855f7',
    };
  }
  if (s.startsWith('TP') || s.startsWith('T')) {
    return {
      id: 'tramite',
      nombre: 'Trámite',
      badgeClass: 'badge-cat-tramite',
      dotColor: '#0ea5e9',
    };
  }
  if (s.startsWith('CP') || s.startsWith('C')) {
    return {
      id: 'cabina',
      nombre: 'Cabinas',
      badgeClass: 'badge-cat-cabina',
      dotColor: '#10b981',
    };
  }
  if (s.startsWith('OP') || s.startsWith('O')) {
    return {
      id: 'orientacion',
      nombre: 'Orientación',
      badgeClass: 'badge-cat-orientacion',
      dotColor: '#f59e0b',
    };
  }
  return {
    id: 'general',
    nombre: 'General',
    badgeClass: 'badge-cat-default',
    dotColor: '#64748b',
  };
}

export function formatearFechaHoy(): string {
  const hoy = new Date();
  const opciones: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return hoy.toLocaleDateString('es-PE', opciones);
}
