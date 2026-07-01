import { useState, useCallback, useMemo } from 'react';
import {
  AuthContext,
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  getStoredToken,
  buildUser,
} from './AuthContext';
import { isTokenExpired } from '../utils/jwt';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());

  const user = useMemo(() => buildUser(token), [token]);

  const login = useCallback((accessToken, refreshToken) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    setToken(accessToken);
  }, []);

  const updateAccessToken = useCallback((newAccessToken) => {
    localStorage.setItem(TOKEN_KEY, newAccessToken);
    setToken(newAccessToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      updateAccessToken,
      isAuthenticated: !!token && !isTokenExpired(token),
    }),
    [token, user, login, logout, updateAccessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
