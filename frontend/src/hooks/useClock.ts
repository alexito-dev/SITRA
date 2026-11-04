/**
 * Hook para reloj en tiempo real sincronizado
 */

import { useState, useEffect } from 'react';

export function useClock(): string {
  const [timeStr, setTimeStr] = useState<string>(() => {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setTimeStr(d.toTimeString().split(' ')[0]);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return timeStr;
}
