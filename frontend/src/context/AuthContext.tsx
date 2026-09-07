import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '../types';
import { apiService } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  quickDemoLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'sih_auth_token';
const USER_KEY = 'sih_user';

/**
 * Demo accounts, seeded by `database/seed_data.py`.
 *
 * These are real credentials against the real API — the login button below
 * performs an actual POST /auth/login and fails if the backend is down or the
 * database is unseeded. That is deliberate: the previous version caught login
 * failures and minted a fake token, so the login screen could never fail and
 * therefore never proved anything.
 */
export const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string; label: string; name: string }> = {
  admin: {
    email: 'admin@cyberintel.gov.in',
    pass: 'Admin@SIH2026!',
    label: 'Inspector General',
    name: 'Inspector General R. Sharma',
  },
  investigator: {
    email: 'investigator@cyberintel.gov.in',
    pass: 'Investigate@2026!',
    label: 'Cyber Investigator',
    name: 'Senior Cyber Investigator K. Mehta',
  },
  analyst: {
    email: 'analyst@cyberintel.gov.in',
    pass: 'Analyst@2026!',
    label: 'Intelligence Analyst',
    name: 'Intelligence Analyst P. Nair',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // On boot, a stored token is verified against the server before it is
  // trusted. No token, or a token the server rejects, means no session.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (!stored) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      try {
        const profile = await apiService.getMe();
        if (cancelled) return;
        setUser(profile);
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    restore();
    return () => { cancelled = true; };
  }, [clearSession]);

  // The API client dispatches this when any request comes back 401, so an
  // expired token drops the session instead of leaving a half-signed-in UI.
  useEffect(() => {
    const onUnauthorized = () => clearSession();
    window.addEventListener('sih:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sih:unauthorized', onUnauthorized);
  }, [clearSession]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiService.login(email, password);
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } finally {
      setIsLoading(false);
    }
  };

  const quickDemoLogin = async (role: UserRole) => {
    const creds = DEMO_CREDENTIALS[role];
    await login(creds.email, creds.pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        quickDemoLogin,
        logout: clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
