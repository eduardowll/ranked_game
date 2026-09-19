import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { useEffect, useState, type ReactNode } from 'react';
import { firebaseAuth, googleProvider } from '../services/firebase';
import { AuthContext } from './authContext';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => onAuthStateChanged(firebaseAuth, (usuario) => {
    setUser(usuario);
    setCarregando(false);
  }), []);

  const entrarComGoogle = async () => {
    await signInWithPopup(firebaseAuth, googleProvider);
  };

  const sair = async () => {
    await signOut(firebaseAuth);
  };

  return <AuthContext.Provider value={{ user, carregando, entrarComGoogle, sair }}>{children}</AuthContext.Provider>;
}
