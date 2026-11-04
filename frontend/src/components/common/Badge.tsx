import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'verde' | 'ambar' | 'rojo' | 'blue' | 'gray';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  pulse = false,
}) => {
  return (
    <span className={`badge-${variant}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600 }}>
      {pulse && (
        <span
          className={`dot-${variant}`}
          style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }}
        />
      )}
      {children}
    </span>
  );
};
