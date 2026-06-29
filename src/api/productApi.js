import apiClient from './apiClient'

// 제품 관리 API (관리자 SUPER_ADMIN)
// 응답 래퍼 ApiResponse { ..., data } 에서 실제 data만 반환

// GET 목록 (페이징)  params: { categoryId, keyword, isActive, page, size }
// 반환: Spring Page 객체 { content, totalElements, totalPages, number, size, ... }
export async function getProductsApi(params = {}) {
  const res = await apiClient.get('/api/admin/products', { params })
  return res.data.data
}

// GET 상세
export async function getProductApi(id) {
  const res = await apiClient.get(`/api/admin/products/${id}`)
  return res.data.data
}

// POST 제품 이미지 업로드 (multipart) → 저장된 공개 URL 반환
export async function uploadProductImageApi(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await apiClient.post('/api/admin/products/image', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data.url
}

// POST 등록
// payload: { categoryId, name, code, description, spec, imageUrl, unitPrice, costPrice, unit, vatApplicable }
export async function createProductApi(payload) {
  const res = await apiClient.post('/api/admin/products', payload)
  return res.data.data
}

// PATCH 수정 (등록과 동일 payload)
export async function updateProductApi(id, payload) {
  const res = await apiClient.patch(`/api/admin/products/${id}`, payload)
  return res.data.data
}

export async function activateProductApi(id) {
  await apiClient.patch(`/api/admin/products/${id}/activate`)
}

export async function deactivateProductApi(id) {
  await apiClient.patch(`/api/admin/products/${id}/deactivate`)
}

export async function deleteProductApi(id) {
  await apiClient.delete(`/api/admin/products/${id}`)
}

// ── 일괄 처리 (체크박스 선택) ── ids: number[]
export async function bulkActivateProductsApi(ids) {
  await apiClient.patch('/api/admin/products/bulk/activate', { ids })
}
export async function bulkDeactivateProductsApi(ids) {
  await apiClient.patch('/api/admin/products/bulk/deactivate', { ids })
}
export async function bulkDeleteProductsApi(ids) {
  await apiClient.delete('/api/admin/products/bulk', { data: { ids } })
}
