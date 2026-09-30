import type {
  LoginInput,
  LoginResponse,
  MfaLoginInput,
  MfaRequiredResponse,
  PublicUser,
} from '@iaa/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import {
  api,
  onSessionRefreshed,
  setSessionExpiredHandler,
  startKeepAlive,
} from '../lib/api-client';
import { tokenStore } from '../lib/token-store';

/**
 * How long a read of the account stays fresh enough when the window regains
 * focus. An administrator granting a module usually tells the person, who then
 * switches back to the console; a minute keeps that prompt while costing at
 * most one small request per minute however often they switch windows.
 */
const ACCOUNT_RECHECK_MS = 60_000;

/**
 * The account to keep after a background read.
 *
 * A read that lands after sign-out, or after someone else signed in on this
 * browser, describes an account that is no longer on screen and is dropped.
 * An unchanged account keeps its old object, so a routine re-read does not
 * re-render every component that asks about permissions.
 */
const reconcileAccount = (current: PublicUser | null, fresh: PublicUser): PublicUser | null => {
  if (!current || current.id !== fresh.id) {
    return current;
  }
  return JSON.stringify(current) === JSON.stringify(fresh) ? current : fresh;
};

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
  /** When the account was last read, so returning to the window can skip a recent one. */
  const lastReadAt = useRef(0);
  /** Set while a read is out, so a refresh it causes does not start another. */
  const reading = useRef(false);

  const readAccount = useCallback((): Promise<PublicUser> => {
    reading.current = true;
    lastReadAt.current = Date.now();
    return api.get<PublicUser>('/auth/me').finally(() => {
      reading.current = false;
    });
  }, []);

  useEffect(() => {
    if (!tokenStore.access) {
      setStatus('unauthenticated');
      return;
    }
    readAccount()
      .then((me) => {
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        tokenStore.clear();
        setStatus('unauthenticated');
      });
  }, [readAccount]);

  /**
   * Reads the account again so permissions changed since sign-in — granted or
   * removed — show in the navigation, routes and buttons without a reload.
   *
   * Skipped while a read is already out: that read comes from the account as
   * stored, so it is as fresh as a second one would be. It is also what stops
   * a loop, since a read answered 401 triggers a refresh, which asks for a
   * read. A failure is left alone; the current account stays on screen, and a
   * session that has truly ended is handled by the session-expired handler.
   */
  const recheckAccount = useCallback(() => {
    if (reading.current || !tokenStore.access) {
      return;
    }
    readAccount()
      .then((fresh) => setUser((current) => reconcileAccount(current, fresh)))
      .catch(() => undefined);
  }, [readAccount]);

  // A refresh — after a token expired, or after a 403 that may have come from
  // permissions changed since sign-in — is when the API re-reads the account.
  useEffect(() => onSessionRefreshed(recheckAccount), [recheckAccount]);

  // A grant made elsewhere does not refresh this console's token until it
  // next asks for something. Looking again on return to the window, at most
  // once a minute, shows the new module without waiting for that.
  useEffect(() => {
    if (status !== 'authenticated') {
      return undefined;
    }
    const recheckIfStale = (): void => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      if (Date.now() - lastReadAt.current < ACCOUNT_RECHECK_MS) {
        return;
      }
      recheckAccount();
    };
    window.addEventListener('focus', recheckIfStale);
    document.addEventListener('visibilitychange', recheckIfStale);
    return () => {
      window.removeEventListener('focus', recheckIfStale);
      document.removeEventListener('visibilitychange', recheckIfStale);
    };
  }, [status, recheckAccount]);

  const login = useCallback(async (input: LoginInput | MfaLoginInput) => {
    const result = await api.post<LoginResponse | MfaRequiredResponse>('/auth/login', input);
    if ('mfaRequired' in result) {
      return result;
    }
    tokenStore.set(result.tokens);
    // The login answer is itself a fresh read of the account.
    lastReadAt.current = Date.now();
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

  // The API sleeps when it is left alone, and the request that wakes it is
  // then whatever the person happened to click — usually Save. A ping on a
  // timer keeps it up for as long as the console is open.
  useEffect(startKeepAlive, []);

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
