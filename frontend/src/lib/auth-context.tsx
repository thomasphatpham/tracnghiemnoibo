'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  position?: string | null;
  role: 'ADMIN' | 'EMPLOYEE';
  status: 'ACTIVE' | 'LOCKED' | 'REQUIRE_SETUP';
  departmentId?: string | null;
  department?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('auth_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify token with backend /api/me in background
        api
          .get('/me')
          .then((res) => {
            if (res.data?.user) {
              setUser(res.data.user);
              localStorage.setItem('auth_user', JSON.stringify(res.data.user));
            }
          })
          .catch(() => {
            // Token invalid or revoked
            setToken(null);
            setUser(null);
            localStorage.removeItem('access_token');
            localStorage.removeItem('auth_user');
          })
          .finally(() => {
            setIsLoading(false);
          });
        return;
      } catch (e) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
  };

  const updateUser = (updatedUser: Partial<User>) => {
    if (!user) return;
    const merged = { ...user, ...updatedUser };
    setUser(merged);
    localStorage.setItem('auth_user', JSON.stringify(merged));
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/me');
      if (res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('auth_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      //
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        updateUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
