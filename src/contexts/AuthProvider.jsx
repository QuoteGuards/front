import { useState, useCallback, useMemo } from 'react';
import { AuthContext, TOKEN_KEY, getStoredToken, buildUser } from './AuthContext';
import { isTokenExpired } from '../utils/jwt';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());

  const user = useMemo(() => buildUser(token), [token]);

  const login = useCallback((accessToken) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated: !!token && !isTokenExpired(token),
    }),
    [token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
