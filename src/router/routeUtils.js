// 역할별 기본 랜딩 경로
export function getDefaultPath(role) {
  if (role === 'SUPER_ADMIN') return '/dashboard'
  if (role === 'SALES_MANAGER') return '/admin/approval'
  return '/quotes'
}
