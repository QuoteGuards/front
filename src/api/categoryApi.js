import apiClient from './apiClient'

// 카테고리 관리 API (SUPER_ADMIN)
// 응답 래퍼 ApiResponse { ..., data } 에서 실제 data만 반환

// GET 트리 목록
export async function getCategoriesApi() {
  const res = await apiClient.get('/api/admin/categories')
  return res.data.data // CategoryTreeResponse[] (children 중첩, productCount 포함)
}

// POST 등록  payload: { parentId, name, slug, sortOrder }
export async function createCategoryApi(payload) {
  const res = await apiClient.post('/api/admin/categories', payload)
  return res.data.data
}

// PATCH 수정  payload: { name, slug, sortOrder }
export async function updateCategoryApi(id, payload) {
  const res = await apiClient.patch(`/api/admin/categories/${id}`, payload)
  return res.data.data
}

export async function activateCategoryApi(id) {
  await apiClient.patch(`/api/admin/categories/${id}/activate`)
}

export async function deactivateCategoryApi(id) {
  await apiClient.patch(`/api/admin/categories/${id}/deactivate`)
}

export async function deleteCategoryApi(id) {
  await apiClient.delete(`/api/admin/categories/${id}`)
}
