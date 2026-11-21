import { useEffect, useState } from 'react';

export function useResendCooldown(initial = 30, sentAt?: number) {
  const [seconds, setSeconds] = useState(() => sentAt === undefined ? initial : Math.max(0, Math.ceil((sentAt + initial * 1000 - Date.now()) / 1000)));
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  return { seconds, restart: () => setSeconds(30) };
}
