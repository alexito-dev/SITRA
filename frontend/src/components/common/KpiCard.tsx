import React from 'react';

interface KpiCardProps {
  icon: React.ReactNode;
  iconColorClass?: 'icon--blue' | 'icon--red' | 'icon--amber' | 'icon--green' | 'icon--purple';
  label: string;
  value: string | number;
  sub?: string;
  trendText?: string;
  trendType?: 'trend--up' | 'trend--down' | 'trend--neutral';
  sparklinePath?: string;
  sparklineColor?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  icon,
  iconColorClass = 'icon--blue',
  label,
  value,
  sub,
  trendText,
  trendType = 'trend--up',
  sparklinePath,
  sparklineColor = '#38bdf8',
}) => {
  return (
    <div className="kpi-card-modern">
      <div className={`kpi-card-icon ${iconColorClass}`}>
        {icon}
      </div>
      <div className="kpi-card-body">
        <span className="kpi-card-label">{label}</span>
        <div className="kpi-card-val-row">
          <span className="kpi-card-val">{value}</span>
          {trendText && (
            <span className={`kpi-trend-pill ${trendType}`}>{trendText}</span>
          )}
          {sparklinePath && (
            <div className="kpi-sparkline">
              <svg viewBox="0 0 65 24" fill="none">
                <path
                  d={sparklinePath}
                  stroke={sparklineColor}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>
        {sub && <span className="kpi-card-sub">{sub}</span>}
      </div>
    </div>
  );
};
