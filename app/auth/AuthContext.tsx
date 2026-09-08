import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { getMasterKey, lockLocal } from '@/service/keyService';
import { clearSyncState } from '@/service/syncEngine';
import { socketService } from '@/service/socketService';

interface AuthContextProps {
  user: User | null;
  authenticating: boolean;
  setAuthenticating: React.Dispatch<React.SetStateAction<boolean>>;
  logout: () => Promise<void>;
  /** True when the E2E master key is available on this device. */
  encryptionReady: boolean;
  /** Re-check the key store (call after unlock/recovery/reset). */
  refreshEncryptionReady: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const generation = useRef(0);

  const refreshEncryptionReady = async () => {
    const current = generation.current;
    const owner = auth.currentUser;
    try {
      const mk = await getMasterKey(true);
      if (generation.current === current && auth.currentUser === owner) setEncryptionReady(!!mk);
    } catch {
      if (generation.current === current && auth.currentUser === owner) setEncryptionReady(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      const current = ++generation.current;
      socketService.disconnect();
      setUser(nextUser);
      setEncryptionReady(false);
      try {
        if (nextUser) {
          const mk = await getMasterKey(true);
          if (generation.current === current) setEncryptionReady(!!mk);
        } else {
          await lockLocal();
          await clearSyncState();
        }
      } catch {
        if (generation.current === current) setEncryptionReady(false);
      }
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    generation.current++;
    socketService.disconnect();
    setEncryptionReady(false);
    await lockLocal();
    await clearSyncState();
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, authenticating, setAuthenticating, logout, encryptionReady, refreshEncryptionReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider };
