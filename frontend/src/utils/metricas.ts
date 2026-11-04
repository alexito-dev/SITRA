import { Intendencia, Sede } from '../types';

export interface Metricas {
  enAtencion: number;
  enCola: number;
  sla: number;
  tickets: number;
  agentes: number;
  esperaMin: number;
  demandaAlta: boolean;
}

const minutosDe = (txt?: string, fallback = 8) =>
  txt && txt.includes(':') ? parseInt(txt.split(':')[0], 10) || 1 : fallback;

export function metricasIti(it: Intendencia): Metricas {
  const t = it.totales || {};
  const enAtencion = t.en_atencion ?? 0;
  const enCola = t.en_cola ?? 0;
  const sla = t.pct_espera_15m ?? 95;
  let agentes = 0;
  (it.sedes || []).forEach((s) => {
    const prod = (s.produccion || []).length;
    agentes += prod > 0 ? prod : s.resumen?.en_atencion ?? 0;
  });
  return {
    enAtencion,
    enCola,
    sla,
    tickets: (t.atendidos_hoy ?? 0) + enAtencion + enCola,
    agentes: agentes || enAtencion,
    esperaMin: minutosDe(t.ta_prom),
    demandaAlta: sla < 91 || enCola > 14,
  };
}

export function metricasSede(s: Sede): Metricas {
  const r = s.resumen || {};
  const enAtencion = r.en_atencion ?? 0;
  const enCola = r.en_cola ?? 0;
  const sla = r.pct_espera_15m ?? 95;
  const prod = (s.produccion || []).length;
  const agentes = prod > 0 ? prod : enAtencion > 0 ? enAtencion + (r.suspendidos ?? 0) : 1;
  return {
    enAtencion,
    enCola,
    sla,
    tickets: (r.atendidos_hoy ?? 0) + enAtencion + enCola,
    agentes,
    esperaMin: minutosDe(r.espera_prom || r.ta_prom),
    demandaAlta: sla < 91 || enCola > 6,
  };
}

// "INTENDENCIA DE TRIBUTOS INTERNOS AREQUIPA" -> "ITI Arequipa"
export function tituloIti(it: Intendencia): string {
  let t = it.siglas || it.nombre || 'ITI';
  if (t.toUpperCase().includes('LIMA')) return 'ITI Lima';
  t = t
    .replace(/INTENDENCIA REGIONAL DE /i, 'ITI ')
    .replace(/INTENDENCIA DE TRIBUTOS INTERNOS /i, 'ITI ')
    .replace(/INTENDENCIA /i, 'ITI ')
    .trim();
  if (!t.toUpperCase().startsWith('ITI')) t = 'ITI ' + t;
  t = t
    .split(' ')
    .map((w, i) => {
      if (i === 0) return 'ITI';
      const l = w.toLowerCase();
      return l === 'de' || l === 'la' ? l : l.charAt(0).toUpperCase() + l.slice(1);
    })
    .join(' ');
  const low = t.toLowerCase();
  if (low.includes('la libertad')) return 'ITI La Libertad';
  if (low.includes('madre de dios')) return 'ITI Madre de Dios';
  if (low.includes('san mart')) return 'ITI San Martín';
  return t;
}
