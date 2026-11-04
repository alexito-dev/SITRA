import React from 'react';
import { Phone, Clock, Headphones, Users } from 'lucide-react';
import { KpiCard } from '../common/KpiCard';

interface HeroKpisProps {
  enAtencion: number;
  enCola: number;
  agentes: number;
  /** Texto bajo "Tickets en curso" (p. ej. "en todas las ITI") */
  ambito: string;
}

export const HeroKpis: React.FC<HeroKpisProps> = ({ enAtencion, enCola, agentes, ambito }) => (
  <section className="nacional-kpis-4-grid" style={{ marginBottom: 20 }}>
    <KpiCard
      icon={<Phone size={20} />}
      iconColorClass="icon--blue"
      label="Tickets en curso"
      value={(enAtencion + enCola).toLocaleString()}
      sub={ambito}
      trendText="+12%"
      trendType="trend--up"
      sparklinePath="M2 18 C15 18, 20 6, 32 10 C44 14, 50 4, 63 8"
      sparklineColor="#38bdf8"
    />
    <KpiCard
      icon={<Clock size={20} />}
      iconColorClass="icon--red"
      label="En cola"
      value={enCola.toLocaleString()}
      sub="llamadas en espera"
      trendText="+18%"
      trendType="trend--up"
      sparklinePath="M2 12 C14 16, 22 20, 34 14 C46 8, 52 16, 63 6"
      sparklineColor="#f87171"
    />
    <KpiCard
      icon={<Headphones size={20} />}
      iconColorClass="icon--green"
      label="En atención"
      value={enAtencion.toLocaleString()}
      sub="gestores atendiendo"
      trendText="+9%"
      trendType="trend--up"
      sparklinePath="M2 16 C12 12, 24 14, 34 8 C44 6, 52 10, 63 4"
      sparklineColor="#4ade80"
    />
    <KpiCard
      icon={<Users size={20} />}
      iconColorClass="icon--purple"
      label="Gestores activos"
      value={agentes.toLocaleString()}
      sub="en ventanilla"
      trendText="+4%"
      trendType="trend--up"
      sparklinePath="M2 14 C14 10, 26 12, 36 8 C46 4, 54 10, 63 6"
      sparklineColor="#a855f7"
    />
  </section>
);
