// Utilidades del tablero de CSC (portadas de tablero.js)

export type Nivel = 'verde' | 'ambar' | 'rojo';

const UMBRALES = {
  espera: { ambar: 12, rojo: 15 },
  atencion: { ambar: 5, rojo: 8 },
  suspension: { ambar: 5, rojo: 8 },
};

export const mmss = (segundos: number): string => {
  const s = Math.max(0, Math.round(segundos));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

export const minutosStr = (segundos: number): string =>
  String(Math.floor(Math.max(0, Math.round(segundos)) / 60)).padStart(2, '0');

export const nivelDe = (tipo: keyof typeof UMBRALES, segundos: number): Nivel => {
  const u = UMBRALES[tipo];
  const m = segundos / 60;
  if (m > u.rojo) return 'rojo';
  if (m >= u.ambar) return 'ambar';
  return 'verde';
};

export interface CategoriaTicket {
  nombre: string;
  clase: string;
  pillClase: string;
}

// Clasifica el ticket por prefijo (Orientación, Trámite, Cabinas, Mesa de Partes)
export const clasificarTicket = (ticket?: string): CategoriaTicket => {
  const s = (ticket || '').toUpperCase().trim();
  if (s.startsWith('M')) return { nombre: 'Mesa de Partes', clase: 'ticket-cat--mesa', pillClase: 'ticket-pill--mesa' };
  if (s.startsWith('T')) return { nombre: 'Trámite', clase: 'ticket-cat--tramite', pillClase: 'ticket-pill--tramite' };
  if (s.startsWith('C')) return { nombre: 'Cabinas', clase: 'ticket-cat--cabina', pillClase: 'ticket-pill--cabina' };
  if (s.startsWith('O')) return { nombre: 'Orientación', clase: 'ticket-cat--orientacion', pillClase: 'ticket-pill--orientacion' };
  return { nombre: 'General', clase: 'ticket-cat--default', pillClase: 'ticket-pill--default' };
};

// Intervalos de 30 minutos (08:30 a 18:00)
export const INTERVALOS_30M = [
  '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00',
  '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00',
];

export const siguienteIntervalo = (label: string): string => {
  if (label === '18:00') return '18:00 (Cierre)';
  const [h, m] = label.split(':').map(Number);
  const total = h * 60 + m + 30;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
