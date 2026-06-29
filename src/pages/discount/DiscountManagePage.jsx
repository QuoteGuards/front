import { useEffect, useState } from 'react'
import {
  getDiscountsApi, createDiscountApi, updateDiscountApi,
  activateDiscountApi, deactivateDiscountApi, deleteDiscountApi,
} from '../../api/discountApi'
import { getCategoriesApi } from '../../api/categoryApi'
import { getProductsApi } from '../../api/productApi'
import PageHeader from '../../components/common/PageHeader'
import SearchPanel, { SearchRow } from '../../components/common/SearchPanel'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Pagination from '../../components/common/Pagination'
import SearchableSelect from '../../components/common/SearchableSelect'

const TABS = [
  { key: '', label: '전체' },
  { key: 'CATEGORY', label: '카테고리' },
  { key: 'PRODUCT', label: '제품' },
]
const TARGET_BADGE = {
  ALL: { label: '전체 적용', color: 'green' },
  CATEGORY: { label: '카테고리', color: 'blue' },
  PRODUCT: { label: '제품', color: 'orange' },
}
const EMPTY_FORM = {
  name: '', targetType: 'ALL', categoryId: '', productId: '',
  maxDiscountRate: '', minProfitRate: '', highAmountThreshold: '',
  effectiveFrom: '', effectiveTo: '',
}

export default function DiscountManagePage() {
  const [tab, setTab] = useState('')           // '' | CATEGORY | PRODUCT
  const [keywordInput, setKeywordInput] = useState('')
  const [search, setSearch] = useState({ keyword: '', active: '', categoryId: '' })
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [pageData, setPageData] = useState({ content: [], totalElements: 0, totalPages: 0 })
  const [activeCount, setActiveCount] = useState(0)
  const [cats, setCats] = useState([])
  const [products, setProducts] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // 모달
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [modalError, setModalError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCategoriesApi().then(t => setCats(flattenAll(t))).catch(() => {})

    // 제품 전체 로드 (페이지 순회) — 500개 초과 제품도 정책 대상으로 선택 가능하도록
    ;(async () => {
      try {
        const PAGE = 500
        let page = 0
        let all = []
        let data
        do {
          data = await getProductsApi({ size: PAGE, page })
          all = all.concat(data.content ?? [])
          page += 1
        } while (data && data.last === false && page < 20) // 안전 상한(최대 10,000개)
        setProducts(all)
      } catch { /* 무시 */ }
    })()
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
  useEffect(() => { loadActiveCount() }, []) // eslint-disable-line

  const onSearch = () => {
    setSearch(s => ({ ...s, keyword: keywordInput.trim() }))
    setPage(0)
  }
  const onResetSearch = () => {
    setKeywordInput('')
    setSearch({ keyword: '', active: '', categoryId: '' })
    setPage(0)
  }

  const rows = pageData.content ?? []
  const catLabel = (id) => cats.find(c => c.id === id)?.path ?? ''
  const targetText = (p) =>
    p.targetType === 'CATEGORY' ? (p.categoryName ?? catLabel(p.categoryId))
      : p.targetType === 'PRODUCT' ? (p.productName ?? '')
        : '전사 공통'

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
    if (saving) return
    setModalError(null)
    if (!form.name.trim()) { setModalError('정책명을 입력하세요.'); return }
    if (form.targetType === 'CATEGORY' && !form.categoryId) { setModalError('카테고리를 선택하세요.'); return }
    if (form.targetType === 'PRODUCT' && !form.productId) { setModalError('제품을 선택하세요.'); return }
    if (form.maxDiscountRate === '' || form.minProfitRate === '' || form.highAmountThreshold === '') {
      setModalError('할인율·최소이익률·고액 기준은 필수입니다.'); return
    }
    const maxDiscount = Number(form.maxDiscountRate)
    const minProfit = Number(form.minProfitRate)
    const highAmount = Number(form.highAmountThreshold)
    if (![maxDiscount, minProfit, highAmount].every(Number.isFinite)) {
      setModalError('할인율·최소이익률·고액 기준은 유효한 숫자여야 합니다.'); return
    }
    if (maxDiscount < 0 || maxDiscount > 100) { setModalError('할인율은 0~100 사이여야 합니다.'); return }
    if (minProfit < 0 || minProfit > 100) { setModalError('최소 이익률은 0~100 사이여야 합니다.'); return }
    if (highAmount < 0) { setModalError('고액 기준 금액은 0 이상이어야 합니다.'); return }
    if (form.effectiveFrom && form.effectiveTo && form.effectiveFrom > form.effectiveTo) {
      setModalError('종료일이 시작일보다 빠를 수 없습니다.'); return
    }
    const payload = {
      name: form.name.trim(),
      targetType: form.targetType,
      categoryId: form.targetType === 'CATEGORY' ? Number(form.categoryId) : null,
      productId: form.targetType === 'PRODUCT' ? Number(form.productId) : null,
      maxDiscountRate: maxDiscount,
      minProfitRate: minProfit,
      highAmountThreshold: highAmount,
      effectiveFrom: form.effectiveFrom ? `${form.effectiveFrom}T00:00:00` : null,
      effectiveTo: form.effectiveTo ? `${form.effectiveTo}T23:59:59` : null,
    }
    setSaving(true)
    try {
      if (editId == null) await createDiscountApi(payload)
      else await updateDiscountApi(editId, payload)
      setModalOpen(false)
      await Promise.all([load(), loadActiveCount()])
    } catch (e) {
      setModalError(e.response?.data?.message ?? '저장 실패 (입력값 확인)')
    } finally {
      setSaving(false)
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

  const columns = [
    { key: 'name', title: '정책명', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    {
      key: '_target', title: '적용 대상',
      render: (_, p) => {
        const b = TARGET_BADGE[p.targetType] ?? TARGET_BADGE.ALL
        return (
          <div>
            <span className={`status-badge status-badge--${b.color}`}>{b.label}</span>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{targetText(p)}</div>
          </div>
        )
      },
    },
    { key: 'maxDiscountRate', title: '할인율', align: 'right', render: (v) => <span style={{ fontWeight: 600 }}>{pct(v)}</span> },
    { key: 'minProfitRate', title: '최소 이익률', align: 'right', render: (v) => pct(v) },
    { key: 'highAmountThreshold', title: '고액 기준', align: 'right', render: (v) => <span style={{ color: 'var(--color-text-sub)' }}>{won(v)}</span> },
    {
      key: '_period', title: '적용 기간', align: 'center',
      render: (_, p) => <span className="text-xs" style={{ color: 'var(--color-text-sub)' }}>{date(p.effectiveFrom)} ~ {p.effectiveTo ? date(p.effectiveTo) : '무기한'}</span>,
    },
    {
      key: '_status', title: '상태', align: 'center',
      render: (_, p) => <span className={`status-badge status-badge--${isActiveOf(p) ? 'green' : 'gray'}`}>{isActiveOf(p) ? '활성' : '비활성'}</span>,
    },
    {
      key: '_actions', title: '관리', align: 'center',
      render: (_, p) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
          <Button variant="outline" size="sm" onClick={() => openEdit(p)}>수정</Button>
          <Button variant="ghost" size="sm" onClick={() => onToggleActive(p)}>{isActiveOf(p) ? '비활성화' : '활성화'}</Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(p)}>삭제</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumbs={['제품', '할인 정책']}
        title="할인 정책"
        actions={<Button variant="primary" onClick={openCreate}>+ 정책 등록</Button>}
      />

      {/* 탭 */}
      <div className="flex mb-4 text-sm" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {TABS.map(t => (
          <TabBtn key={t.key} active={tab === t.key} onClick={() => { setTab(t.key); setPage(0) }}>{t.label}</TabBtn>
        ))}
      </div>

      {/* 검색 패널 */}
      <SearchPanel>
        <SearchRow label="검색">
          <input className="form-input" style={{ width: '220px' }} placeholder="정책명 검색"
            value={keywordInput} onChange={e => setKeywordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()} />
          <SearchableSelect width="220px" value={search.categoryId}
            placeholder="카테고리 전체"
            options={[{ value: '', label: '카테고리 전체' }, ...cats.map(c => ({ value: c.id, label: c.path }))]}
            onChange={v => { setSearch(s => ({ ...s, categoryId: v })); setPage(0) }} />
          <select className="form-select" style={{ width: '110px' }} value={search.active}
            onChange={e => { setSearch(s => ({ ...s, active: e.target.value })); setPage(0) }}>
            <option value="">상태 전체</option>
            <option value="true">활성</option>
            <option value="false">비활성</option>
          </select>
          <Button variant="secondary" onClick={onSearch}>검색</Button>
          <Button variant="ghost" onClick={onResetSearch}>초기화</Button>
        </SearchRow>
      </SearchPanel>

      <div style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--color-text-sub)' }}>
        총 <strong style={{ color: 'var(--color-text-main)' }}>{pageData.totalElements ?? 0}</strong>건
        {' · '}현재 활성 <strong style={{ color: 'var(--color-success)' }}>{activeCount}</strong>건
      </div>

      {error && (
        <div role="alert" className="mb-3 text-sm rounded-[var(--radius-sm)] px-4 py-2.5"
          style={{ color: 'var(--color-danger)', background: '#FEF2F2', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}

      <DataTable columns={columns} data={rows} rowKey="id" loading={loading} emptyText="등록된 정책이 없습니다." />
      <Pagination page={page} totalPages={pageData.totalPages ?? 0} onChange={setPage} />

      {/* ── 등록/수정 모달 ── */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}
          onClick={() => !saving && setModalOpen(false)}>
          <div style={{ background: '#FFFFFF', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            {/* 헤더 */}
            <div style={{ background: 'var(--color-navy)', color: '#fff', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}>
              <h2 style={{ fontWeight: 700, fontSize: '16px' }}>정책 {editId == null ? '등록' : '수정'}</h2>
              <button onClick={() => !saving && setModalOpen(false)} disabled={saving} aria-label="닫기"
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '18px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>✕</button>
            </div>

            <div style={{ padding: '24px' }}>
              {modalError && (
                <div role="alert" style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--color-danger)', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                  {modalError}
                </div>
              )}

              <ModalRow label="정책명 *">
                <input className="form-input" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: 2025 상반기 전사 할인" />
              </ModalRow>

              <div style={{ marginTop: '16px' }}>
                <ModalRow label="적용 대상">
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center', height: '40px' }}>
                    {['ALL', 'CATEGORY', 'PRODUCT'].map(t => (
                      <label key={t} className="form-checkbox">
                        <input type="radio" checked={form.targetType === t}
                          onChange={() => setForm({ ...form, targetType: t, categoryId: '', productId: '' })} />
                        {TARGET_BADGE[t].label}
                      </label>
                    ))}
                  </div>
                </ModalRow>
              </div>

              {form.targetType === 'CATEGORY' && (
                <div style={{ marginTop: '16px' }}>
                  <ModalRow label="대상 카테고리 *">
                    <SearchableSelect value={form.categoryId} placeholder="카테고리 선택"
                      options={cats.map(c => ({ value: c.id, label: c.path }))}
                      onChange={v => setForm({ ...form, categoryId: v })} />
                  </ModalRow>
                </div>
              )}
              {form.targetType === 'PRODUCT' && (
                <div style={{ marginTop: '16px' }}>
                  <ModalRow label="대상 제품 *">
                    <SearchableSelect value={form.productId} placeholder="제품 검색·선택"
                      options={products.map(p => ({ value: p.id, label: `${p.name} (${p.code})` }))}
                      onChange={v => setForm({ ...form, productId: v })} />
                  </ModalRow>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <ModalRow label="할인율 (%) *">
                  <PctInput value={form.maxDiscountRate} onChange={v => setForm({ ...form, maxDiscountRate: v })} />
                </ModalRow>
                <ModalRow label="최소 이익률 (%) *">
                  <PctInput value={form.minProfitRate} onChange={v => setForm({ ...form, minProfitRate: v })} />
                </ModalRow>
                <ModalRow label="고액 견적 승인 기준 (원) *">
                  <input type="number" min="0" className="form-input" value={form.highAmountThreshold}
                    onChange={e => setForm({ ...form, highAmountThreshold: e.target.value })} placeholder="5000000" />
                </ModalRow>
                <div />
                <ModalRow label="정책 적용 시작일">
                  <input type="date" className="form-input" value={form.effectiveFrom}
                    onChange={e => setForm({ ...form, effectiveFrom: e.target.value })} />
                </ModalRow>
                <ModalRow label="정책 적용 종료일">
                  <input type="date" className="form-input" value={form.effectiveTo}
                    onChange={e => setForm({ ...form, effectiveTo: e.target.value })} />
                </ModalRow>
              </div>

              <div style={{ marginTop: '16px', background: '#FEF2F2', border: '1px solid #FECACA', color: 'var(--color-danger)', fontSize: '13px', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                ⚠️ 변경 내용은 신규 견적부터 적용됩니다. 기존 진행 중인 견적에는 소급 적용되지 않습니다.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>취소</Button>
                <Button variant="primary" onClick={onSubmit} disabled={saving}>{saving ? '저장 중…' : '정책 저장'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 헬퍼 ──
function isActiveOf(p) { return p?.isActive ?? p?.active ?? false }

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

function pct(v) { return v == null || v === '' ? '—' : `${Number(v)}%` }
function won(v) { return v == null || v === '' ? '-' : Number(v).toLocaleString('ko-KR') + '원' }
function date(v) { return v ? v.slice(0, 10) : '' }

function PctInput({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <input type="number" step="0.01" min="0" max="100" className="form-input" value={value}
        onChange={e => onChange(e.target.value)} placeholder="0" />
      <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>%</span>
    </div>
  )
}

function ModalRow({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: '13px', color: 'var(--color-text-sub)', marginBottom: '4px' }}>{label}</div>
      {children}
    </div>
  )
}

function TabBtn({ children, active, onClick }) {
  return (
    <button onClick={onClick} className="px-4 py-2.5 whitespace-nowrap -mb-px"
      style={{
        borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
        color: active ? 'var(--color-primary)' : 'var(--color-text-sub)',
        fontWeight: active ? 600 : 400,
      }}>
      {children}
    </button>
  )
}
