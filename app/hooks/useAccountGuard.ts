import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { auth } from '@/firebaseConfig';

/** Capture before async work; check before using its result or making a write. */
export default function useAccountGuard() {
  const { user, encryptionReady } = useAuth();
  const state = useRef({ user, encryptionReady, version: 0 });
  const mounted = useRef(true);
  if (state.current.user !== user || state.current.encryptionReady !== encryptionReady) {
    state.current = { user, encryptionReady, version: state.current.version + 1 };
  }
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; state.current.version++; };
  }, []);
  const capture = useCallback(() => {
    const version = state.current.version;
    return () => mounted.current && state.current.version === version &&
      !!user && auth.currentUser === user && encryptionReady;
  }, [user, encryptionReady]);
  const invalidate = useCallback(() => { state.current.version++; }, []);
  return { capture, invalidate };
}
