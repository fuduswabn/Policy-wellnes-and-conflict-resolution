import React, { createContext, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

export interface User {
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'employee';
  companyId?: Id<"companies">;
  companyName?: string;
  subscriptionStatus?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: 'employee' | 'manager' | 'admin', companyName?: string, inviteCode?: string) => Promise<void>;
  signOut: () => Promise<void>;
  restoreUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signInMutation = useMutation(api.users.signIn);
  const signUpMutation = useMutation(api.users.signUp);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await signInMutation({ email, password });
    const userData: User = {
      userId: result.userId,
      email: result.email,
      fullName: result.fullName,
      role: result.role,
      companyId: result.companyId,
      companyName: result.companyName,
      subscriptionStatus: result.subscriptionStatus,
    };
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  }, [signInMutation]);

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    fullName: string, 
    role: 'employee' | 'manager' | 'admin',
    companyName?: string,
    inviteCode?: string
  ) => {
    const result = await signUpMutation({ 
      email, 
      password, 
      fullName, 
      role,
      companyName,
      inviteCode,
    });
    const userData: User = {
      userId: result.userId,
      email: result.email,
      fullName: result.fullName,
      role: result.role,
      companyId: result.companyId,
    };
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  }, [signUpMutation]);

  const signOut = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem('user');
  }, []);

  const restoreUser = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to restore user:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    setUser((prev: User | null) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, restoreUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}