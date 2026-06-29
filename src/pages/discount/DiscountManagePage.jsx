import { useEffect, useState } from 'react'
import {
  getDiscountsApi, createDiscountApi, updateDiscountApi,
  activateDiscountApi, deactivateDiscountApi, deleteDiscountApi,
} from '../../api/discountApi'
import { getCategoriesApi } from '../../api/categoryApi'
import { getProductsApi } from '../../api/productApi'

const TABS = [
  { key: '', label: '전체' },
  { key: 'CATEGORY', label: '카테고리' },
  { key: 'PRODUCT', label: '제품' },
]
const TARGET_BADGE = {
  ALL: { label: '전체 적용', cls: 'bg-green-50 text-green-600' },
  CATEGORY: { label: '카테고리', cls: 'bg-blue-50 text-blue-600' },
  PRODUCT: { label: '제품', cls: 'bg-amber-50 text-amber-600' },
}
const EMPTY_FORM = {
  name: '', targetType: 'ALL', categoryId: '', productId: '',
  maxDiscountRate: '', minProfitRate: '', highAmountThreshold: '',
  effectiveFrom: '', effectiveTo: '',
}

export default function DiscountManagePage() {
  const [tab, setTab] = useState('')           // '' | CATEGORY | PRODUCT
  // 검색 필터: 정책명 키워드 + 상태(활성/비활성)
  const [keywordInput, setKeywordInput] = useState('')
  const [search, setSearch] = useState({ keyword: '', active: '', categoryId: '' }) // 적용된 검색
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [pageData, setPageData] = useState({ content: [], totalElements: 0, totalPages: 0 })
  const [activeCount, setActiveCount] = useState(0)
  const [cats, setCats] = useState([])         // 전체 카테고리(경로 라벨)
  const [products, setProducts] = useState([]) // 제품 드롭다운용
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // 모달
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [modalError, setModalError] = useState(null)

  useEffect(() => {
    getCategoriesApi().then(t => setCats(flattenAll(t))).catch(() => {})
    getProductsApi({ size: 500 }).then(p => setProducts(p.content ?? [])).catch(() => {})
  }, [])

  const loadActiveCount = async () => {
    try {
      const d = await getDiscountsApi({ isActive: true, size: 1 })
      setActiveCount(d.totalElements ?? 0)
    } catch { /* 무시 */ }
  }

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const params = { page, size }
      if (tab) params.targetType = tab
      if (search.keyword) params.keyword = search.keyword
      if (search.active !== '') params.isActive = search.active === 'true'
      if (search.categoryId) params.categoryId = search.categoryId
      const data = await getDiscountsApi(params)
      setPageData(data)
    } catch (e) {
      setError(e.response?.data?.message ?? '할인 정책 목록 조회 실패')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [tab, page, search]) // eslint-disable-line

  const onSearch = () => {
    setSearch(s => ({ ...s, keyword: keywordInput.trim() }))
    setPage(0)
  }
  const onResetSearch = () => {
    setKeywordInput('')
    setSearch({ keyword: '', active: '', categoryId: '' })
    setPage(0)
  }
  useEffect(() => { loadActiveCount() }, []) // eslint-disable-line

  const rows = pageData.content ?? []
  const totalPages = pageData.totalPages ?? 0

  const catLabel = (id) => cats.find(c => c.id === id)?.path ?? ''

  // ── 모달 ──
  const openCreate = () => {
    setEditId(null); setForm(EMPTY_FORM); setModalError(null); setModalOpen(true)
  }
  const openEdit = (p) => {
    setEditId(p.id)
    setForm({
      name: p.name ?? '',
      targetType: p.targetType ?? 'ALL',
      categoryId: p.categoryId ?? '',
      productId: p.productId ?? '',
      maxDiscountRate: p.maxDiscountRate ?? '',
      minProfitRate: p.minProfitRate ?? '',
      highAmountThreshold: p.highAmountThreshold ?? '',
      effectiveFrom: p.effectiveFrom ? p.effectiveFrom.slice(0, 10) : '',
      effectiveTo: p.effectiveTo ? p.effectiveTo.slice(0, 10) : '',
    })
    setModalError(null); setModalOpen(true)
  }

  const onSubmit = async () => {
    setModalError(null)
    if (!form.name.trim()) { setModalError('정책명을 입력하세요.'); return }
    if (form.targetType === 'CATEGORY' && !form.categoryId) { setModalError('카테고리를 선택하세요.'); return }
    if (form.targetType === 'PRODUCT' && !form.productId) { setModalError('제품을 선택하세요.'); return }
    if (form.maxDiscountRate === '' || form.minProfitRate === '' || form.highAmountThreshold === '') {
      setModalError('할인율·최소이익률·고액 기준은 필수입니다.'); return
    }
    const payload = {
      name: form.name.trim(),
      targetType: form.targetType,
      categoryId: form.targetType === 'CATEGORY' ? Number(form.categoryId) : null,
      productId: form.targetType === 'PRODUCT' ? Number(form.productId) : null,
      maxDiscountRate: Number(form.maxDiscountRate),
      minProfitRate: Number(form.minProfitRate),
      highAmountThreshold: Number(form.highAmountThreshold),
      effectiveFrom: form.effectiveFrom ? `${form.effectiveFrom}T00:00:00` : null,
      effectiveTo: form.effectiveTo ? `${form.effectiveTo}T23:59:59` : null,
    }
    try {
      if (editId == null) await createDiscountApi(payload)
      else await updateDiscountApi(editId, payload)
      setModalOpen(false)
      await Promise.all([load(), loadActiveCount()])
    } catch (e) {
      setModalError(e.response?.data?.message ?? '저장 실패 (입력값 확인)')
    }
  }

  const onToggleActive = async (p) => {
    try {
      isActiveOf(p) ? await deactivateDiscountApi(p.id) : await activateDiscountApi(p.id)
      await Promise.all([load(), loadActiveCount()])
    } catch (e) {
      setError(e.response?.data?.message ?? '상태 변경 실패')
    }
  }

  const onDelete = async (p) => {
    if (!confirm(`'${p.name}' 정책을 삭제할까요?`)) return
    try {
      await deleteDiscountApi(p.id)
      await Promise.all([load(), loadActiveCount()])
    } catch (e) {
      setError(e.response?.data?.message ?? '삭제 실패')
    }
  }

  const targetText = (p) =>
    p.targetType === 'CATEGORY' ? (p.categoryName ?? catLabel(p.categoryId))
      : p.targetType === 'PRODUCT' ? (p.productName ?? '')
        : '전사 공통'

  return (
    <div className="p-6">
      {/* ── 정책 목록 헤더 ── */}
      <div className="border rounded-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">정책 목록</h1>
            <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded-full">
              현재 활성: {activeCount}건
            </span>
          </div>
          <button onClick={openCreate} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">+ 정책 등록</button>
        </div>

        {/* 탭 */}
        <div className="flex border-b text-sm">
          {TABS.map(t => (
            <button key={t.key}
              onClick={() => { setTab(t.key); setPage(0) }}
              className={`px-5 py-3 ${tab === t.key ? 'bg-blue-600 text-white font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 검색 바: 정책명 + 상태 */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b">
          <input className="border px-3 py-2 rounded text-sm flex-1 min-w-[180px]"
            placeholder="정책명 검색"
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()} />
          <select className="border px-2 py-2 rounded text-sm max-w-[200px]"
            value={search.categoryId}
            onChange={e => { setSearch(s => ({ ...s, categoryId: e.target.value })); setPage(0) }}>
            <option value="">카테고리 전체</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.path}</option>)}
          </select>
          <select className="border px-2 py-2 rounded text-sm"
            value={search.active}
            onChange={e => { setSearch(s => ({ ...s, active: e.target.value })); setPage(0) }}>
            <option value="">상태 전체</option>
            <option value="true">활성</option>
            <option value="false">비활성</option>
          </select>
          <button onClick={onSearch} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">검색</button>
          <button onClick={onResetSearch} className="border px-4 py-2 rounded text-sm">초기화</button>
        </div>

        {error && <div className="px-4 pt-3 text-red-500 text-sm">{error}</div>}

        {/* 테이블 */}
        <table className="w-full text-sm">
          <thead className="text-gray-500 border-b">
            <tr>
              <th className="px-4 py-3 text-left">정책명</th>
              <th className="px-4 py-3 text-left">적용 대상</th>
              <th className="px-4 py-3 text-right">할인율</th>
              <th className="px-4 py-3 text-right">최소 이익률</th>
              <th className="px-4 py-3 text-right">고액 기준</th>
              <th className="px-4 py-3 text-center">적용 기간</th>
              <th className="px-4 py-3 text-center">상태</th>
              <th className="px-4 py-3 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center text-gray-400 py-10">불러오는 중…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-gray-400 py-10">등록된 정책이 없습니다</td></tr>
            ) : rows.map(p => {
              const badge = TARGET_BADGE[p.targetType] ?? TARGET_BADGE.ALL
              return (
                <tr key={p.id} className={`border-b hover:bg-gray-50 ${!isActiveOf(p) ? 'text-gray-400' : ''}`}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                    <div className="text-xs text-gray-400 mt-1">{targetText(p)}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{pct(p.maxDiscountRate)}</td>
                  <td className="px-4 py-3 text-right">{pct(p.minProfitRate)}</td>
                  <td className="px-4 py-3 text-right">{won(p.highAmountThreshold)}</td>
                  <td className="px-4 py-3 text-center text-xs">
                    {date(p.effectiveFrom)} ~ {p.effectiveTo ? date(p.effectiveTo) : '무기한'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${isActiveOf(p) ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'}`}>
                      {isActiveOf(p) ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => openEdit(p)} className="text-blue-600 text-xs">수정</button>
                      <button onClick={() => onToggleActive(p)} className={`text-xs ${isActiveOf(p) ? 'text-gray-500' : 'text-green-600'}`}>
                        {isActiveOf(p) ? '비활성화' : '활성화'}
                      </button>
                      <button onClick={() => onDelete(p)} className="text-red-500 text-xs">삭제</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* 페이징 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1 py-4">
            <PageBtn disabled={page === 0} onClick={() => setPage(page - 1)}>이전</PageBtn>
            {Array.from({ length: totalPages }, (_, i) => i).map(i => (
              <PageBtn key={i} active={i === page} onClick={() => setPage(i)}>{i + 1}</PageBtn>
            ))}
            <PageBtn disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>다음</PageBtn>
          </div>
        )}
      </div>

      {/* ── 등록/수정 모달 ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-700 text-white px-5 py-3 flex items-center justify-between rounded-t-lg">
              <h2 className="font-bold">정책 {editId == null ? '등록' : '수정'}</h2>
              <button onClick={() => setModalOpen(false)} className="bg-blue-600 w-7 h-7 rounded">✕</button>
            </div>

            <div className="p-6">
              {modalError && <div className="mb-3 text-red-500 text-sm">{modalError}</div>}

              <Row label="정책명 *">
                <input className="border px-3 py-2 rounded w-full" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: 2025 상반기 전사 할인" />
              </Row>

              <div className="mt-4">
                <Row label="적용 대상">
                  <div className="flex gap-6 items-center">
                    {['ALL', 'CATEGORY', 'PRODUCT'].map(t => (
                      <label key={t} className="flex items-center gap-1 text-sm">
                        <input type="radio" checked={form.targetType === t}
                          onChange={() => setForm({ ...form, targetType: t, categoryId: '', productId: '' })} />
                        {TARGET_BADGE[t].label}
                      </label>
                    ))}
                  </div>
                </Row>
              </div>

              {form.targetType === 'CATEGORY' && (
                <div className="mt-4">
                  <Row label="대상 카테고리 *">
                    <select className="border px-3 py-2 rounded w-full" value={form.categoryId}
                      onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                      <option value="">선택</option>
                      {cats.map(c => <option key={c.id} value={c.id}>{c.path}</option>)}
                    </select>
                  </Row>
                </div>
              )}
              {form.targetType === 'PRODUCT' && (
                <div className="mt-4">
                  <Row label="대상 제품 *">
                    <select className="border px-3 py-2 rounded w-full" value={form.productId}
                      onChange={e => setForm({ ...form, productId: e.target.value })}>
                      <option value="">선택</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                    </select>
                  </Row>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4">
                <Row label="할인율 (%) *">
                  <PctInput value={form.maxDiscountRate} onChange={v => setForm({ ...form, maxDiscountRate: v })} />
                </Row>
                <Row label="최소 이익률 (%) *">
                  <PctInput value={form.minProfitRate} onChange={v => setForm({ ...form, minProfitRate: v })} />
                </Row>
                <Row label="고액 견적 승인 기준 (원) *">
                  <input type="number" className="border px-3 py-2 rounded w-full" value={form.highAmountThreshold}
                    onChange={e => setForm({ ...form, highAmountThreshold: e.target.value })} placeholder="5000000" />
                </Row>
                <div />
                <Row label="정책 적용 시작일">
                  <input type="date" className="border px-3 py-2 rounded w-full" value={form.effectiveFrom}
                    onChange={e => setForm({ ...form, effectiveFrom: e.target.value })} />
                </Row>
                <Row label="정책 적용 종료일">
                  <input type="date" className="border px-3 py-2 rounded w-full" value={form.effectiveTo}
                    onChange={e => setForm({ ...form, effectiveTo: e.target.value })} placeholder="미설정 시 무기한" />
                </Row>
              </div>

              <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded px-3 py-2">
                ⚠️ 변경 내용은 신규 견적부터 적용됩니다. 기존 진행 중인 견적에는 소급 적용되지 않습니다.
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setModalOpen(false)} className="border px-4 py-2 rounded">취소</button>
                <button onClick={onSubmit} className="bg-blue-600 text-white px-4 py-2 rounded">정책 저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 헬퍼 ──
// DiscountPolicyResponse.isActive(Boolean) → JSON "isActive". 혹시 모를 직렬화차이 대비 둘 다 수용
function isActiveOf(p) {
  return p?.isActive ?? p?.active ?? false
}

// 카테고리 트리 전체 평탄화 (대/중/소 모두 선택 가능, 경로 라벨)
function flattenAll(tree) {
  const out = []
  const walk = (nodes, path) => {
    for (const n of nodes ?? []) {
      const p = [...path, n.name]
      out.push({ id: n.id, path: p.join(' > ') })
      if (n.children?.length) walk(n.children, p)
    }
  }
  walk(tree, [])
  return out
}

function pct(v) {
  return v == null || v === '' ? '—' : `${Number(v)}%`
}
function won(v) {
  return v == null || v === '' ? '-' : Number(v).toLocaleString('ko-KR') + '원'
}
function date(v) {
  return v ? v.slice(0, 10) : ''
}

function PctInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <input type="number" step="0.01" className="border px-3 py-2 rounded w-full" value={value}
        onChange={e => onChange(e.target.value)} placeholder="0" />
      <span className="text-gray-400 text-sm">%</span>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      {children}
    </div>
  )
}

function PageBtn({ children, active, disabled, onClick }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className={`min-w-8 px-2 py-1 rounded text-sm border
        ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
      {children}
    </button>
  )
}
