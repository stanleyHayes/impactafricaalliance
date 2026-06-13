import type { LoginInput, LoginResponse, PublicUser } from '@iaa/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { api } from '../lib/api-client';
import { tokenStore } from '../lib/token-store';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: PublicUser | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    if (!tokenStore.access) {
      setStatus('unauthenticated');
      return;
    }
    api
      .get<PublicUser>('/auth/me')
      .then((me) => {
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        tokenStore.clear();
        setStatus('unauthenticated');
      });
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const result = await api.post<LoginResponse>('/auth/login', input);
    tokenStore.set(result.tokens);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
