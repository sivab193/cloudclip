import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

// Define the shape of the AuthContext
interface AuthContextProps {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => Promise<void>;
}

// Create the AuthContext with an undefined initial value
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider Component
const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null); // Clear user state on logout
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {/* Render the children only after loading is complete */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

export { AuthProvider };
