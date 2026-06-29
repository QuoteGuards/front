import apiClient from './apiClient'

// 할인 정책 관리 API (관리자 SUPER_ADMIN)
// 응답 래퍼 ApiResponse { ..., data } 에서 실제 data만 반환

// GET 목록 (페이징)  params: { targetType, isActive, page, size }
// 반환: Spring Page { content, totalElements, totalPages, number, size, ... }
export async function getDiscountsApi(params = {}) {
  const res = await apiClient.get('/api/admin/discounts', { params })
  return res.data.data
}

// GET 상세
export async function getDiscountApi(id) {
  const res = await apiClient.get(`/api/admin/discounts/${id}`)
  return res.data.data
}

// POST 등록
// payload: { name, targetType, categoryId?, productId?, maxDiscountRate, minProfitRate, highAmountThreshold, effectiveFrom?, effectiveTo? }
export async function createDiscountApi(payload) {
  const res = await apiClient.post('/api/admin/discounts', payload)
  return res.data.data
}

// PATCH 수정 (등록과 동일 payload)
export async function updateDiscountApi(id, payload) {
  const res = await apiClient.patch(`/api/admin/discounts/${id}`, payload)
  return res.data.data
}

export async function activateDiscountApi(id) {
  await apiClient.patch(`/api/admin/discounts/${id}/activate`)
}

export async function deactivateDiscountApi(id) {
  await apiClient.patch(`/api/admin/discounts/${id}/deactivate`)
}

export async function deleteDiscountApi(id) {
  await apiClient.delete(`/api/admin/discounts/${id}`)
}
