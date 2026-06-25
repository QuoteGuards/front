import { useState, useCallback, useMemo } from 'react';
import { AuthContext, TOKEN_KEY, MUST_CHANGE_PASSWORD_KEY, getStoredToken, buildUser } from './AuthContext';
import { isTokenExpired } from '../utils/jwt';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [mustChangePassword, setMustChangePassword] = useState(
    () => localStorage.getItem(MUST_CHANGE_PASSWORD_KEY) === 'true'
  );

  const user = useMemo(() => buildUser(token), [token]);

  const login = useCallback((accessToken, mustChange = false) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    if (mustChange) {
      localStorage.setItem(MUST_CHANGE_PASSWORD_KEY, 'true');
    } else {
      localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
    }
    setMustChangePassword(mustChange);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
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
      isAuthenticated: !!token && !isTokenExpired(token),
      mustChangePassword,
      clearMustChangePassword,
    }),
    [token, user, login, logout, mustChangePassword, clearMustChangePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
