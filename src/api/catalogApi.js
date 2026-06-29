import apiClient from './apiClient'

// 영업사원용 제품 탐색/즐겨찾기 API (/api/products, 전체 인증 사용자)
// 활성 제품만 조회됨. 응답은 ProductSearchResponse (원가 미포함)
// 응답 래퍼 ApiResponse { ..., data } 에서 실제 data만 반환

// GET 제품 검색 (페이징)  params: { categoryId, keyword, page, size }
// 반환: Spring Page { content, totalElements, totalPages, number, size, ... }
export async function searchProductsApi(params = {}) {
  const res = await apiClient.get('/api/products', { params })
  return res.data.data
}

// GET 제품 상세
export async function getProductDetailApi(id) {
  const res = await apiClient.get(`/api/products/${id}`)
  return res.data.data
}

// GET 즐겨찾기 목록 (페이징)
export async function getFavoriteProductsApi(params = {}) {
  const res = await apiClient.get('/api/products/favorites', { params })
  return res.data.data
}

// POST 즐겨찾기 추가
export async function addFavoriteApi(productId) {
  await apiClient.post(`/api/products/${productId}/favorites`)
}

// DELETE 즐겨찾기 해제
export async function removeFavoriteApi(productId) {
  await apiClient.delete(`/api/products/${productId}/favorites`)
}

// DELETE 즐겨찾기 전체 해제 (벌크 — 서버에서 트랜잭션 1번으로 일괄 삭제)
export async function removeAllFavoritesApi() {
  await apiClient.delete('/api/products/favorites')
}
