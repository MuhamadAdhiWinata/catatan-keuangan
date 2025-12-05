import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, seedCategories, User } from '@/lib/database';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUserId = localStorage.getItem('finance_user_id');
    if (storedUserId) {
      db.users.get(parseInt(storedUserId)).then(user => {
        if (user) {
          setUser(user);
        } else {
          localStorage.removeItem('finance_user_id');
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const existingUser = await db.users.where('username').equals(username.toLowerCase()).first();
      
      if (!existingUser) {
        return { success: false, error: 'User not found' };
      }

      if (existingUser.password !== password) {
        return { success: false, error: 'Invalid password' };
      }

      setUser(existingUser);
      localStorage.setItem('finance_user_id', existingUser.id!.toString());
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const register = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const existingUser = await db.users.where('username').equals(username.toLowerCase()).first();
      
      if (existingUser) {
        return { success: false, error: 'Username already exists' };
      }

      if (username.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters' };
      }

      if (password.length < 4) {
        return { success: false, error: 'Password must be at least 4 characters' };
      }

      const userId = await db.users.add({
        username: username.toLowerCase(),
        password,
        createdAt: new Date(),
      });

      // Seed default categories for the new user
      await seedCategories(userId);

      const newUser = await db.users.get(userId);
      if (newUser) {
        setUser(newUser);
        localStorage.setItem('finance_user_id', userId.toString());
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('finance_user_id');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
