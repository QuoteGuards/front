const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * 기본 fetch 래퍼
 * 서버의 ApiResponse { status, code, message, data } 형식을 기준으로 응답을 처리한다.
 */
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const { headers: optionHeaders, ...restOptions } = options;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...optionHeaders,
      },
      ...restOptions,
    });
  } catch {
    // 네트워크 오류 (서버 미응답, DNS 실패 등)
    throw { type: 'NETWORK_ERROR', message: '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.' };
  }

  const body = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    body, // { status, code, message, data }
  };
}

export async function post(path, payload, headers = {}) {
  return request(path, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers,
  });
}

export async function get(path, headers = {}) {
  return request(path, { method: 'GET', headers });
}

export function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
