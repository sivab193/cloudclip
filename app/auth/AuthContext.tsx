import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { getMasterKey, lockLocal } from '@/service/keyService';

interface AuthContextProps {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
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
  const [loading, setLoading] = useState(true);

  const refreshEncryptionReady = async () => {
    const mk = await getMasterKey();
    setEncryptionReady(!!mk);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const mk = await getMasterKey();
        setEncryptionReady(!!mk);
      } else {
        setEncryptionReady(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      await lockLocal();
      setUser(null);
      setEncryptionReady(false);
    } catch (error) {
      console.error('Error logging out: ', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, encryptionReady, refreshEncryptionReady }}>
      {/* Render the children only after loading is complete */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

export { AuthProvider };
