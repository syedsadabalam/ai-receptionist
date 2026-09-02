"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  token: string | null;
  username: string | null;
  isSuperAdmin: boolean;
  login: (token: string, username: string, isSuperAdmin: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    const savedIsSuperAdmin = localStorage.getItem('is_super_admin') === 'true';
    if (savedToken) {
      setToken(savedToken);
      setUsername(savedUser);
      setIsSuperAdmin(savedIsSuperAdmin);

    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;

    const isPublicRoute = pathname === '/login' || pathname === '/register';
    const isAdminRoute = pathname.startsWith('/admin');

    if (!token && !isPublicRoute) {
      router.replace('/login');
      return;
    }

    if (token && isSuperAdmin && !isAdminRoute && !isPublicRoute) {
      router.replace('/admin');
      return;
    }
  }, [token, isSuperAdmin, pathname, loading, router, username]);

  const login = useCallback((newToken: string, newUsername: string, newIsSuperAdmin: boolean) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', newUsername);
    localStorage.setItem('is_super_admin', newIsSuperAdmin ? 'true' : 'false');

    setToken(newToken);
    setUsername(newUsername);
    setIsSuperAdmin(newIsSuperAdmin);

    const destination = newIsSuperAdmin ? '/admin' : '/';
    router.push(destination);
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('is_super_admin');
    setToken(null);
    setUsername(null);
    setIsSuperAdmin(false);
    router.push('/login');
  }, [router, username]);

  return (
    <AuthContext.Provider value={{ token, username, isSuperAdmin, login, logout, isAuthenticated: !!token }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
