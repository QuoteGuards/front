import { createContext } from 'react';
import { decodeJwt, isTokenExpired } from '../utils/jwt';

export const AuthContext = createContext(null);

export const TOKEN_KEY = 'qg_access_token';
export const REFRESH_TOKEN_KEY = 'qg_refresh_token';

export function getStoredToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return token;
}

export function buildUser(token) {
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}
