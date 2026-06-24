import apiClient from './apiClient'

const unwrap = (response) => response.data?.data

/**
 * @typedef {Object} CustomerSearchItem
 * @property {number} id
 * @property {string} companyName
 * @property {string} contactName
 * @property {string} [phone]
 * @property {string} [email]
 */

/**
 * @typedef {Object} CustomerDetail
 * @property {number} id
 * @property {string} companyName
 * @property {string} contactName
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [address]
 * @property {string} [businessNumber]
 * @property {string} [memo]
 */

/** @param {Record<string, unknown>} data */
const toCustomerSearchItem = (data) => ({
    id: data.id,
    companyName: data.companyName ?? '',
    contactName: data.contactName ?? '',
    phone: data.phone ?? '',
    email: data.email ?? '',
})

/** @param {Record<string, unknown>} data */
const toCustomerDetail = (data) => ({
    id: data.id,
    companyName: data.companyName ?? '',
    contactName: data.contactName ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
    address: data.address ?? '',
    businessNumber: data.businessNumber ?? '',
    memo: data.memo ?? '',
})

/**
 * GET /api/customers/search?name=
 * 견적 작성 화면 고객 검색 (회사명 부분일치, 로그인한 영업사원이 등록한 고객만 조회됨)
 * @param {string} name
 * @returns {Promise<CustomerSearchItem[]>}
 */
export async function searchCustomers(name) {
    const response = await apiClient.get('/api/customers/search', { params: { name } })
    const list = unwrap(response) ?? []
    return list.map(toCustomerSearchItem)
}

/**
 * GET /api/customers/{customerId}
 * @param {number} customerId
 * @returns {Promise<CustomerDetail>}
 */
export async function getCustomerDetail(customerId) {
    const response = await apiClient.get(`/api/customers/${customerId}`)
    return toCustomerDetail(unwrap(response) ?? {})
}

/**
 * POST /api/customers - 신규 고객 등록
 * @param {{companyName: string, contactName: string, email?: string, phone?: string, businessNumber?: string, address?: string, memo?: string}} payload
 * @returns {Promise<CustomerDetail>}
 */
export async function createCustomer(payload) {
    const response = await apiClient.post('/api/customers', payload)
    return toCustomerDetail(unwrap(response) ?? {})
}

/**
 * PUT /api/customers/{customerId} - 고객 정보 수정
 * @param {number} customerId
 * @param {{companyName: string, contactName: string, email?: string, phone?: string, businessNumber?: string, address?: string, memo?: string}} payload
 * @returns {Promise<CustomerDetail>}
 */
export async function updateCustomer(customerId, payload) {
    const response = await apiClient.put(`/api/customers/${customerId}`, payload)
    return toCustomerDetail(unwrap(response) ?? {})
}
