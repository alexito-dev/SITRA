/**
 * Definiciones de tipos para SITRA Frontend
 */

export interface User {
  id: number;
  nombre: string;
  login: string;
  correo: string;
  rol: 'admin' | 'directivo' | 'analista' | 'invitado';
  ip?: string;
  es_local?: boolean;
  activo?: number;
}

export interface Intendencia {
  codigo: string;
  nombre: string;
  siglas: string;
  region: string;
  color: string;
  tipo_conexion: 'real' | 'simulado';
  descripcion?: string;
  orden?: number;
  total_sedes?: number;
  sedes_simuladas?: number;
  sedes_reales?: number;
  activo?: number;
  // Campos computados en comparativo
  tickets_curso?: number;
  en_espera?: number;
  en_atencion?: number;
  espera_prom_min?: number;
  sla_pct?: number;
  conectado?: boolean;
  sedes_online?: number;
  // Forma real que devuelve /api/comparativo
  totales?: TotalesIti;
  sedes?: Sede[];
}

export interface TotalesIti {
  atendidos_hoy?: number;
  en_atencion?: number;
  en_cola?: number;
  suspendidos?: number;
  pct_espera_15m?: number;
  ta_prom?: string;
  ta_prom_segundos?: number;
  sedes_activas?: number;
  total_sedes?: number;
}

export interface ResumenSede {
  atendidos_hoy?: number;
  en_atencion?: number;
  en_cola?: number;
  suspendidos?: number;
  pct_espera_15m?: number;
  espera_prom?: string;
  ta_prom?: string;
  ta_prom_segundos?: number;
}

export interface Sede {
  codigo: string;
  nombre: string;
  intendencia_codigo: string;
  intendencia_nombre?: string;
  host: string;
  puerto: number;
  instancia: string;
  base_datos: string;
  usuario: string;
  clave: string;
  es_simulado: number;
  latencia_ms?: number;
  ultimo_test_estado?: string;
  ultimo_test_fecha?: string;
  activo: number;
  conectado?: boolean;
  // Métricas en tiempo real
  tickets_curso?: number;
  en_espera?: number;
  en_atencion?: number;
  espera_prom_min?: number;
  sla_pct?: number;
  // Forma real que devuelve /api/comparativo
  resumen?: ResumenSede;
  intendencia_siglas?: string;
  produccion?: unknown[];
  espera_max_seg?: number;
}

export interface TicketEspera {
  id_ticket: number;
  num_ticket: string;
  nombre_cliente?: string;
  hora_emision: string;
  segundos: number;
  ruc?: string;
}

export interface TicketAtencion {
  id_ticket: number;
  num_ticket: string;
  num_ventanilla: string | number;
  funcionario: string;
  nombre_cliente?: string;
  hora_inicio: string;
  segundos: number;
  ruc?: string;
}

export interface TicketSuspension {
  funcionario: string;
  motivo: string;
  hora_inicio: string;
  segundos: number;
}

export interface ProduccionFuncionario {
  funcionario: string;
  total: number;
  segundos_promedio: number;
  promedio_str?: string;
  dentro_sla?: number;
  porcentaje_sla?: number;
}

export interface DemandaHora {
  hora: number;
  tickets: number;
}

export interface TableroKpis {
  tickets_hoy: number;
  en_espera: number;
  en_atencion: number;
  suspendidos: number;
  espera_promedio_seg: number;
  espera_max_seg: number;
  atencion_promedio_seg: number;
  cumplimiento_sla_pct: number;
  ventanillas_activas: number;
}

// Forma real que devuelve /api/tablero/{codigo}
export interface TicketTablero {
  ticket: string;
  cliente?: string;
  ruc?: string;
  gestor?: string;
  ventanilla?: string;
  hora?: string;
  segundos: number;
  minutos?: string;
  tiempo?: string;
  nivel: 'verde' | 'ambar' | 'rojo';
}

export interface ProduccionGestor {
  gestor: string;
  atenciones: number;
  prom_minutos?: string;
  prom_segundos?: number;
  promedio?: string;
  nivel: 'verde' | 'ambar' | 'rojo';
}

export interface SubtipoProduccion {
  atenciones: number;
  prom_minutos?: string;
  nivel: 'verde' | 'ambar' | 'rojo';
}

export interface ProduccionTipo extends SubtipoProduccion {
  categoria: string;
  general?: SubtipoProduccion;
  preferencial?: SubtipoProduccion;
}

export interface SuspensionTablero {
  gestor: string;
  motivo: string;
  hora: string;
  tiempo: string;
  segundos: number;
  nivel: 'verde' | 'ambar' | 'rojo';
}

export interface IntervaloTablero {
  intervalo?: string;
  hora?: number;
  minuto?: number;
  emitidos?: number;
  flujo?: number;
  promedio_hora?: number;
  promedio_dia?: number;
  promedio_mes?: number;
}

export interface TableroSedeData {
  sede: string;
  codigo: string;
  intendencia_codigo?: string;
  conectado: boolean;
  es_simulado?: boolean;
  actualizado: string;
  error?: string;
  espera: TicketTablero[];
  atencion: TicketTablero[];
  suspension: SuspensionTablero[];
  produccion: ProduccionGestor[];
  produccion_tipo: ProduccionTipo[];
  demanda: IntervaloTablero[];
  flujo_dia: IntervaloTablero[];
  flujo_mes: IntervaloTablero[];
  promedio_dia?: number;
  promedio_mes?: number;
  resumen: ResumenSede & {
    llamadas_activas?: number;
    espera_max?: string;
    espera_max_nivel?: string;
    pct_espera_alerta?: boolean;
    ta_prom_nivel?: string;
  };
}

export interface ResumenNacional {
  total_tickets_curso: number;
  total_en_cola: number;
  espera_promedio_min: number;
  cumplimiento_sla_pct: number;
  total_sedes_online: number;
  total_sedes: number;
}

export interface TotalesRegionales extends TotalesIti {
  espera_max_regional?: string;
  sedes_caidas?: number;
  sedes_total?: number;
}

export interface ComparativoData {
  totales_regionales?: TotalesRegionales;
  resumen_nacional?: ResumenNacional;
  intendencias: Intendencia[];
  sedes: Sede[];
  usuario?: Partial<User>;
}

export interface GuiaPregunta {
  id: number;
  pregunta: string;
  respuesta: string;
}

export interface ReporteTicket {
  id_ticket: number;
  num_ticket: string;
  hora_emision: string;
  hora_llamada?: string;
  hora_fin?: string;
  espera_min: number;
  atencion_min: number;
  estado: string;
  ventanilla?: string;
  funcionario?: string;
  categoria?: string;
  cumple_sla: boolean;
}

export interface ReporteDiaResponse {
  sede: string;
  fecha: string;
  total_tickets: number;
  atendidos: number;
  abandonados: number;
  espera_prom_min: number;
  atencion_prom_min: number;
  cumplimiento_sla_pct: number;
  tickets: ReporteTicket[];
  es_detallado?: boolean;
}
