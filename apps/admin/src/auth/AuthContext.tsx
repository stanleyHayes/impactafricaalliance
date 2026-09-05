import type { LoginInput, LoginResponse, MfaLoginInput, MfaRequiredResponse, PublicUser } from '@iaa/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { api, setSessionExpiredHandler } from '../lib/api-client';
import { tokenStore } from '../lib/token-store';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: PublicUser | null;
  status: AuthStatus;
  login: (input: LoginInput | MfaLoginInput) => Promise<LoginResponse | MfaRequiredResponse>;
  logout: () => void;
  updateUser: (user: PublicUser) => void;
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

  const login = useCallback(async (input: LoginInput | MfaLoginInput) => {
    const result = await api.post<LoginResponse | MfaRequiredResponse>('/auth/login', input);
    if ('mfaRequired' in result) {
      return result;
    }
    tokenStore.set(result.tokens);
    setUser(result.user);
    setStatus('authenticated');
    return result;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // An expired session signs the user out wherever it is discovered, including
  // from a background refetch, so they land on the login screen rather than on
  // a page whose every action fails.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const updateUser = useCallback((next: PublicUser) => setUser(next), []);

  const value = useMemo(
    () => ({ user, status, login, logout, updateUser }),
    [user, status, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
