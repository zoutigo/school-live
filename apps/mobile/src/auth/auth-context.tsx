import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { createApiClient } from '../api/client';
import {
  clearAccessToken,
  getAccessToken,
  getSchoolSlug,
  saveAccessToken,
  saveSchoolSlug
} from './storage';
import type { AuthResponse, AuthUser } from './types';

type AuthContextValue = {
  isBootstrapping: boolean;
  schoolSlug: string | null;
  user: AuthUser | null;
  signedIn: boolean;
  selectSchool: (schoolSlug: string) => Promise<void>;
  signInWithCredentials: (payload: { email: string; password: string }) => Promise<void>;
  fetchMe: () => Promise<AuthUser | null>;
  fetchGrades: () => Promise<unknown[]>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    async function loadStoredSession() {
      const [storedSlug, storedToken] = await Promise.all([getSchoolSlug(), getAccessToken()]);
      setSchoolSlug(storedSlug);
      setAccessToken(storedToken);
      setIsBootstrapping(false);
    }

    void loadStoredSession();
  }, []);

  const api = useMemo(
    () =>
      createApiClient({
        getSchoolSlug: () => schoolSlug,
        getToken: () => accessToken
      }),
    [accessToken, schoolSlug]
  );

  const selectSchool = useCallback(async (slug: string) => {
    const normalized = slug.trim().toLowerCase();
    setSchoolSlug(normalized);
    await saveSchoolSlug(normalized);
    setUser(null);
  }, []);

  const signInWithCredentials = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      if (!schoolSlug) {
        throw new Error('School slug missing');
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/schools/${schoolSlug}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        }
      );

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const payload = (await response.json()) as AuthResponse;
      setAccessToken(payload.accessToken);
      await saveAccessToken(payload.accessToken);

      const meResponse = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/schools/${schoolSlug}/me`,
        {
          headers: { Authorization: `Bearer ${payload.accessToken}` }
        }
      );

      if (meResponse.ok) {
        setUser((await meResponse.json()) as AuthUser);
      }
    },
    [schoolSlug]
  );

  const fetchMe = useCallback(async () => {
    const response = await api.request('/me');

    if (!response.ok) {
      setUser(null);
      return null;
    }

    const payload = (await response.json()) as AuthUser;
    setUser(payload);
    return payload;
  }, [api]);

  const fetchGrades = useCallback(async () => {
    const response = await api.request('/grades');

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as unknown[];
  }, [api]);

  const logout = useCallback(async () => {
    setAccessToken(null);
    setUser(null);
    await clearAccessToken();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isBootstrapping,
      schoolSlug,
      user,
      signedIn: Boolean(accessToken),
      selectSchool,
      signInWithCredentials,
      fetchMe,
      fetchGrades,
      logout
    }),
    [accessToken, fetchGrades, fetchMe, isBootstrapping, logout, schoolSlug, selectSchool, signInWithCredentials, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
