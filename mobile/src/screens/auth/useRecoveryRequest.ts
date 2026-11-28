import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import { requestPasswordReset } from '../../api/passwordRecovery';
import { registrationError } from '../../api/registration';

export function useRecoveryRequest(initialDeadline: number, onRequested: (email: string, deadline: number) => void) {
  const [deadline, setDeadline] = useState(initialDeadline);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { mounted.current = false; clearInterval(timer); };
  }, []);
  async function send(email: string) {
    if (pending.current || Date.now() < deadline) return false;
    pending.current = true; setBusy(true); setError('');
    try {
      await requestPasswordReset(email);
      if (!mounted.current) return false;
      // The non-enumerating API deliberately returns no timestamps. The documented
      // request cooldown is 30s; expiry and code validity are checked by the server.
      const next = Date.now() + 30000;
      setDeadline(next); setNow(Date.now()); onRequested(email.trim().toLowerCase(), next);
      return true;
    } catch (error) {
      if (mounted.current) {
        setError(registrationError(error));
        if (error instanceof ApiError && error.retryAfterSeconds) {
          const next = Date.now() + error.retryAfterSeconds * 1000;
          setDeadline(next); setNow(Date.now()); onRequested(email.trim().toLowerCase(), next);
        }
      }
      return false;
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return { send, busy, error, setError, seconds: Math.max(0, Math.ceil((deadline - now) / 1000)) };
}
