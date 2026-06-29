import apiClient from './apiClient'

// 카테고리 관리 API (SUPER_ADMIN)
// 응답 래퍼 ApiResponse { ..., data } 에서 실제 data만 반환

// GET 트리 목록 (관리자 전용)
export async function getCategoriesApi() {
  const res = await apiClient.get('/api/admin/categories')
  return res.data.data // CategoryTreeResponse[] (children 중첩, productCount 포함)
}

// GET 활성 카테고리의 직속 자식 (전체 인증 사용자, 드릴다운)
// parentId 없으면 대분류 목록. 반환: CategoryResponse[] (children/productCount 없음)
export async function getCategoryChildrenApi(parentId) {
  const res = await apiClient.get('/api/categories', {
    params: parentId != null ? { parentId } : {},
  })
  return res.data.data
}

// 활성 카테고리 전체 트리 (영업사원용 — 단일 호출, 백엔드 /api/categories/tree)
// 기존 드릴다운 재귀(노드당 1콜 = N+1)를 한 번의 호출로 대체
// 반환: CategoryTreeResponse[] (children 중첩, productCount 포함)
export async function getActiveCategoryTreeApi() {
  const res = await apiClient.get('/api/categories/tree')
  return res.data.data
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
