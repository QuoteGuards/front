import { useState, useCallback, useMemo } from 'react';
import {
  AuthContext,
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  MUST_CHANGE_PASSWORD_KEY,
  getStoredToken,
  buildUser,
} from './AuthContext';
import { isTokenExpired } from '../utils/jwt';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [mustChangePassword, setMustChangePassword] = useState(
    () => localStorage.getItem(MUST_CHANGE_PASSWORD_KEY) === 'true'
  );

  const user = useMemo(() => buildUser(token), [token]);

  const login = useCallback((accessToken, refreshToken, mustChange = false) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    setToken(accessToken);
    if (mustChange) {
      localStorage.setItem(MUST_CHANGE_PASSWORD_KEY, 'true');
    } else {
      localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
    }
    setMustChangePassword(mustChange);
  }, []);

  const updateAccessToken = useCallback((newAccessToken) => {
    localStorage.setItem(TOKEN_KEY, newAccessToken);
    setToken(newAccessToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
    setToken(null);
    setMustChangePassword(false);
  }, []);

  const clearMustChangePassword = useCallback(() => {
    localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
    setMustChangePassword(false);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      updateAccessToken,
      isAuthenticated: !!token && !isTokenExpired(token),
      mustChangePassword,
      clearMustChangePassword,
    }),
    [token, user, login, logout, updateAccessToken, mustChangePassword, clearMustChangePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
