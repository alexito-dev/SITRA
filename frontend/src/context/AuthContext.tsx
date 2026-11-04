/**
 * Contexto de Autenticación para SITRA
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isDirectivo: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
  login: (correo: string, pass: string) => Promise<void>;
  loginGuest: () => Promise<void>;
  logout: () => Promise<void>;
  setupAdmin: (correo: string, pass: string, nombre?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const data = await api.auth.me();
      if (data && data.usuario) {
        setUser(data.usuario);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (correo: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.auth.login(correo, pass);
      if (res.ok && res.usuario) {
        setUser(res.usuario);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginGuest = async () => {
    setLoading(true);
    try {
      await api.auth.invitado();
      setUser({
        id: 0,
        nombre: 'Invitado SUNAT',
        login: 'invitado',
        correo: 'invitado@sunat.gob.pe',
        rol: 'invitado',
        activo: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.auth.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const setupAdmin = async (correo: string, pass: string, nombre?: string) => {
    setLoading(true);
    try {
      const res = await api.auth.setupAdmin(correo, pass, nombre);
      if (res.ok && res.usuario) {
        setUser(res.usuario);
      }
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.rol === 'admin';
  const isDirectivo = user?.rol === 'admin' || user?.rol === 'directivo';
  const isGuest = user?.rol === 'invitado';
  const isAuthenticated = Boolean(user && user.id > 0);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isDirectivo,
        isGuest,
        isAuthenticated,
        login,
        loginGuest,
        logout,
        setupAdmin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
