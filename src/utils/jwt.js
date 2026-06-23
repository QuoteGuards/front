/**
 * JWT payload 디코딩 (서명 검증 없이 payload만 추출)
 * 보안 검증은 백엔드에서 수행하며, 클라이언트에서는 claims 읽기 용도로만 사용
 */
export function decodeJwt(token) {
  try {
    const payloadBase64 = token.split('.')[1];
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized));
    return decoded;
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}
