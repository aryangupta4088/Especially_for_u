import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const USER_TOKEN_KEY = 'efu_user_token';
const USER_DATA_KEY = 'efu_user_data';

const AuthContext = createContext(null);

function readStoredAuth() {
  try {
    const token = localStorage.getItem(USER_TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_DATA_KEY);
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token: token || '', user };
  } catch {
    return { token: '', user: null };
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStoredAuth().token);
  const [user, setUser] = useState(() => readStoredAuth().user);
  const [loading, setLoading] = useState(false);

  const persist = useCallback((newToken, newUser) => {
    if (newToken) localStorage.setItem(USER_TOKEN_KEY, newToken);
    else localStorage.removeItem(USER_TOKEN_KEY);
    if (newUser) localStorage.setItem(USER_DATA_KEY, JSON.stringify(newUser));
    else localStorage.removeItem(USER_DATA_KEY);
    setToken(newToken || '');
    setUser(newUser || null);
  }, []);

  const request = useCallback(async (path, body, { method = 'POST', includeAuth = true } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (includeAuth && token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
    return data;
  }, [token]);

  const register = useCallback(async ({ name, email, password, phone }) => {
    setLoading(true);
    try {
      const data = await request('/api/auth/register', { name, email, password, phone }, { includeAuth: false });
      persist(data.token, data.user);
      return data;
    } finally { setLoading(false); }
  }, [request, persist]);

  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    try {
      const data = await request('/api/auth/login', { email, password }, { includeAuth: false });
      persist(data.token, data.user);
      return data;
    } finally { setLoading(false); }
  }, [request, persist]);

  const loginWithGoogle = useCallback(async (payload) => {
    setLoading(true);
    try {
      const data = await request('/api/auth/google', payload, { includeAuth: false });
      persist(data.token, data.user);
      return data;
    } finally { setLoading(false); }
  }, [request, persist]);

  const logout = useCallback(() => {
    persist('', null);
  }, [persist]);

  const forgotPassword = useCallback(async ({ email }) => {
    setLoading(true);
    try {
      return await request('/api/auth/forgot-password', { email }, { includeAuth: false });
    } finally { setLoading(false); }
  }, [request]);

  const resetPassword = useCallback(async ({ token: resetToken, password }) => {
    setLoading(true);
    try {
      return await request('/api/auth/reset-password', { token: resetToken, password }, { includeAuth: false });
    } finally { setLoading(false); }
  }, [request]);

  const fetchMe = useCallback(async () => {
    if (!token) return null;
    try {
      const data = await request('/api/auth/me', undefined, { method: 'GET' });
      if (data.user) setUser(data.user);
      return data.user;
    } catch (err) {
      if (/SESSION|TOKEN|UNAUTH/i.test(err.message)) persist('', null);
      return null;
    }
  }, [token, request, persist]);

  useEffect(() => {
    if (token && !user) fetchMe();
  }, [token, user, fetchMe]);

  const authenticated = Boolean(token && user);
  const value = useMemo(() => ({
    token,
    user,
    loading,
    isAuthenticated: authenticated,
    login,
    register,
    loginWithGoogle,
    logout,
    forgotPassword,
    resetPassword,
    fetchMe,
    request,
  }), [token, user, loading, authenticated, login, register, loginWithGoogle, logout, forgotPassword, resetPassword, fetchMe, request]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
