import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getProductsApi, createProductApi, updateProductApi,
  activateProductApi, deactivateProductApi, deleteProductApi,
  bulkActivateProductsApi, bulkDeactivateProductsApi, bulkDeleteProductsApi,
} from '../../api/productApi'
import { getCategoriesApi } from '../../api/categoryApi'
import PageHeader from '../../components/common/PageHeader'
import SearchPanel, { SearchRow } from '../../components/common/SearchPanel'
import DataTable from '../../components/common/DataTable'
import Button from '../../components/common/Button'
import '../../components/common/FormControls.css'

const PAGE_SIZES = [10, 20, 50]
const EMPTY_FORM = {
  code: '', name: '', categoryId: '', description: '', imageUrl: '',
  unitPrice: '', costPrice: '', unit: 'EA', spec: '', vatApplicable: true, isActive: true,
}

// 백엔드 boolean isActive → Jackson이 JSON 키 "active"로 직렬화하므로 둘 다 수용
function isActiveOf(p) { return p?.isActive ?? p?.active ?? false }

function flattenLeaves(tree) {
  const out = []
  const walk = (nodes, path) => {
    for (const n of nodes ?? []) {
      const p = [...path, n.name]
      if (n.children?.length) walk(n.children, p)
      else out.push({ id: n.id, path: p.join(' > ') })
    }
  }
  walk(tree, [])
  return out
}

function won(v) {
  if (v == null || v === '') return '-'
  return Number(v).toLocaleString('ko-KR') + '원'
}

function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function Thumb({ src, size = 36 }) {
  if (!src) {
    return (
      <div style={{ width: size, height: size, background: '#F3F4F6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D1D5DB', fontSize: '11px', flexShrink: 0 }}>
        無
      </div>
    )
  }
  return (
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--color-border)', flexShrink: 0 }}
      onError={(e) => { e.currentTarget.style.display = 'none' }} />
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

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  const btnStyle = (active, disabled) => ({
    minWidth: '32px', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '13px',
    border: '1px solid var(--color-border)', cursor: disabled ? 'not-allowed' : 'pointer',
    background: active ? 'var(--color-primary)' : '#fff', color: active ? '#fff' : 'var(--color-text-sub)',
    opacity: disabled ? 0.4 : 1,
  })
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '20px' }}>
      <button style={btnStyle(false, page === 0)} disabled={page === 0} onClick={() => onPageChange(page - 1)}>이전</button>
      {Array.from({ length: totalPages }, (_, i) => i)
        .filter(i => Math.abs(i - page) <= 2 || i === 0 || i === totalPages - 1)
        .map((i, idx, arr) => (
          <span key={i} style={{ display: 'flex' }}>
            {idx > 0 && arr[idx - 1] !== i - 1 && <span style={{ padding: '0 4px', color: 'var(--color-text-muted)' }}>…</span>}
            <button style={btnStyle(i === page, false)} onClick={() => onPageChange(i)}>{i + 1}</button>
          </span>
        ))}
      <button style={btnStyle(false, page >= totalPages - 1)} disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>다음</button>
    </div>
  )
}

export default function ProductManagePage() {
  // 카테고리 관리 화면에서 "제품 목록 보기"로 넘어올 때 ?categoryId= 로 초기 필터 지정
  const [searchParams, setSearchParams] = useSearchParams()
  const initCategoryId = searchParams.get('categoryId') ?? ''
  // 검색 필터 (입력값)
  const [filter, setFilter] = useState({ categoryId: initCategoryId, keyword: '', vat: '', active: '' })
  // 실제 적용된 필터 (검색 버튼 눌렀을 때만 반영)
  const [applied, setApplied] = useState({ categoryId: initCategoryId, keyword: '', vat: '', active: '' })
  const [filter, setFilter] = useState({ categoryId: '', keyword: '', vat: '', active: '' })
  const [applied, setApplied] = useState({ categoryId: '', keyword: '', active: '' })
  const [vatFilter, setVatFilter] = useState('')

  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [pageData, setPageData] = useState({ content: [], totalElements: 0, totalPages: 0 })
  const [leafCats, setLeafCats] = useState([]) // 소분류(말단) — 등록/수정 모달용
  const [allCats, setAllCats] = useState([])   // 대/중/소 전체 — 검색 필터용(자손 매칭)
  const [leafCats, setLeafCats] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set()) // 체크박스 선택 (일괄 처리용)

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [modalError, setModalError] = useState(null)

  // 카테고리 트리 로드 → 모달용(말단)/필터용(전체) 평탄화
  useEffect(() => {
    getCategoriesApi().then(tree => {
      setLeafCats(flattenLeaves(tree))
      setAllCats(flattenAll(tree))
    }).catch(e => setError(e.response?.data?.message ?? '카테고리 목록을 불러오지 못했습니다.'))
  }, [])

  // applied 필터 → API 쿼리 파라미터 (VAT 포함, 전부 서버 처리)
  const buildParams = (base) => {
    const params = { ...base }
    if (applied.categoryId) params.categoryId = applied.categoryId
    if (applied.keyword) params.keyword = applied.keyword
    if (applied.active !== '') params.isActive = applied.active === 'true'
    if (applied.vat !== '') params.vatApplicable = applied.vat === 'true'
    return params
  }

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const data = await getProductsApi(buildParams({ page, size }))
      setPageData(data)
      setSelectedIds(new Set()) // 목록 갱신 시 선택 초기화
    } catch (e) {
      setError(e.response?.data?.message ?? '제품 목록 조회 실패')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [applied, page, size]) // eslint-disable-line

  const onSearch = () => {
    setApplied({ categoryId: filter.categoryId, keyword: filter.keyword.trim(), vat: filter.vat, active: filter.active })
    setPage(0)
  }
  const onReset = () => {
    setFilter({ categoryId: '', keyword: '', vat: '', active: '' })
    setApplied({ categoryId: '', keyword: '', vat: '', active: '' })
    setPage(0)
    if (searchParams.toString()) setSearchParams({}) // "제품 목록 보기"로 들어온 ?categoryId= 등 URL 쿼리 정리
  }

  const rows = pageData.content ?? []
  const rows = useMemo(() => {
    let list = pageData.content ?? []
    if (vatFilter !== '') list = list.filter(p => p.vatApplicable === (vatFilter === 'true'))
    return list
  }, [pageData, vatFilter])

  // 카테고리 전체 경로 라벨 (전체 목록에 없으면 백엔드 categoryName 폴백)
  const catLabel = (p) => allCats.find(c => c.id === p.categoryId)?.path ?? p.categoryName ?? ''
  const catLabel = (p) => leafCats.find(c => c.id === p.categoryId)?.path ?? p.categoryName ?? ''

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setModalError(null); setModalOpen(true) }
  const openEdit = (p) => {
    setEditId(p.id)
    setForm({
      code: p.code, name: p.name, categoryId: p.categoryId ?? '',
      description: p.description ?? '', imageUrl: p.imageUrl ?? '',
      unitPrice: p.unitPrice ?? '', costPrice: p.costPrice ?? '',
      unit: p.unit ?? 'EA', spec: p.spec ?? '',
      vatApplicable: p.vatApplicable, isActive: isActiveOf(p),
    })
    setModalError(null); setModalOpen(true)
  }

  const onSubmit = async () => {
    setModalError(null)
    if (!form.code.trim() || !form.name.trim() || !form.categoryId) {
      setModalError('제품코드, 제품명, 카테고리는 필수입니다.'); return
    }
    // 단가/원가 검증: 필수 + 0 이상 + 원가 ≤ 단가
    if (form.unitPrice === '' || form.costPrice === '') {
      setModalError('단가와 원가를 입력하세요.'); return
    }
    const unitPriceNum = Number(form.unitPrice)
    const costPriceNum = Number(form.costPrice)
    if (!Number.isFinite(unitPriceNum) || !Number.isFinite(costPriceNum) || unitPriceNum < 0 || costPriceNum < 0) {
      setModalError('단가·원가는 0 이상의 유효한 숫자여야 합니다.'); return
    }
    if (costPriceNum > unitPriceNum) {
      setModalError('원가가 단가보다 클 수 없습니다.'); return
    }
    const payload = {
      categoryId: Number(form.categoryId), name: form.name.trim(), code: form.code.trim(),
      description: form.description?.trim() || null, spec: form.spec?.trim() || null,
      imageUrl: form.imageUrl?.trim() || null,
      unitPrice: form.unitPrice === '' ? 0 : Number(form.unitPrice),
      costPrice: form.costPrice === '' ? 0 : Number(form.costPrice),
      unit: form.unit?.trim() || 'EA', vatApplicable: form.vatApplicable,
      unitPrice: unitPriceNum,
      costPrice: costPriceNum,
      unit: form.unit?.trim() || 'EA',
      vatApplicable: form.vatApplicable,
    }
    try {
      let saved
      if (editId == null) saved = await createProductApi(payload)
      else saved = await updateProductApi(editId, payload)
      if (editId != null && isActiveOf(saved) !== form.isActive) {
        form.isActive ? await activateProductApi(editId) : await deactivateProductApi(editId)
      }
      setModalOpen(false)
      await load()
    } catch (e) {
      setModalError(e.response?.data?.message ?? '저장 실패 (제품코드 중복/형식 확인)')
    }
  }

  const onToggleActive = async (p) => {
    try {
      isActiveOf(p) ? await deactivateProductApi(p.id) : await activateProductApi(p.id)
      await load()
    } catch (e) {
      setError(e.response?.data?.message ?? '상태 변경 실패')
    }
  }

  const onDelete = async (p) => {
    if (!confirm(`'${p.name}' 삭제할까요? (견적에 연결된 제품은 삭제 불가)`)) return
    try {
      await deleteProductApi(p.id)
      await load()
    } catch (e) {
      setError(e.response?.data?.message ?? '삭제 실패')
    }
  }

  // ── 체크박스 선택 ──
  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const allChecked = rows.length > 0 && rows.every(p => selectedIds.has(p.id))
  const toggleAll = () => {
    setSelectedIds(allChecked ? new Set() : new Set(rows.map(p => p.id)))
  }

  // ── 일괄 처리 ──
  const runBulk = async (fn, label) => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    if (label === '삭제' && !confirm(`선택한 ${ids.length}개 제품을 삭제할까요? (견적 연결 제품은 실패)`)) return
    setError(null)
    try {
      await fn(ids)
      await load()
    } catch (e) {
      setError(e.response?.data?.message ?? `일괄 ${label} 실패`)
    }
  }
  const onBulkActivate = () => runBulk(bulkActivateProductsApi, '활성화')
  const onBulkDeactivate = () => runBulk(bulkDeactivateProductsApi, '비활성화')
  const onBulkDelete = () => runBulk(bulkDeleteProductsApi, '삭제')

  // 현재 페이지가 아니라 "검색 조건에 맞는 전체 결과"를 내보냄
  const exportCsv = async () => {
    setError(null)
    try {
      const EXPORT_CAP = 10000
      const total = pageData.totalElements ?? 0
      // 한도 초과 시 잘린다는 점을 명시하고 동의받음
      if (total > EXPORT_CAP &&
          !confirm(`검색 결과가 ${total.toLocaleString('ko-KR')}개입니다. 처음 ${EXPORT_CAP.toLocaleString('ko-KR')}개만 내보냅니다. 계속할까요?`)) {
        return
      }
      const data = await getProductsApi(buildParams({ page: 0, size: Math.min(Math.max(total, 1), EXPORT_CAP) }))
      const list = data.content ?? []
      if (list.length === 0) { alert('내보낼 제품이 없습니다.'); return }

      const header = ['제품코드', '제품명', '규격', '카테고리', '단가', '원가', 'VAT', '상태']
      const lines = list.map(p => [
        p.code, p.name, p.spec ?? '', catLabel(p),
        p.unitPrice, p.costPrice, p.vatApplicable ? '적용' : '미적용', isActiveOf(p) ? '사용' : '미사용',
      ].map(csvCell).join(','))
      const csv = '﻿' + [header.join(','), ...lines].join('\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
      const a = document.createElement('a')
      a.href = url; a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`
      a.click(); URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.response?.data?.message ?? '엑셀 다운로드 실패')
    }
  const exportCsv = () => {
    const header = ['제품코드', '제품명', '규격', '카테고리', '단가', '원가', 'VAT', '상태']
    const lines = rows.map(p => [
      p.code, p.name, p.spec ?? '', catLabel(p), p.unitPrice, p.costPrice,
      p.vatApplicable ? '적용' : '미적용', isActiveOf(p) ? '사용' : '미사용',
    ].map(csvCell).join(','))
    const csv = '﻿' + [header.join(','), ...lines].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const columns = [
    { key: 'code', title: '제품코드', render: (val) => <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-text-sub)' }}>{val}</span> },
    {
      key: 'name',
      title: '제품명',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Thumb src={row.imageUrl} />
          <div>
            <div style={{ fontWeight: 500 }}>{val}</div>
            {row.spec && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{row.spec}</div>}
          </div>
        </div>
      ),
    },
    { key: '_cat', title: '카테고리', render: (_, row) => <span style={{ color: 'var(--color-text-sub)' }}>{catLabel(row)}</span> },
    { key: 'unitPrice', title: '단가', align: 'right', render: (val) => <span style={{ fontWeight: 500 }}>{won(val)}</span> },
    { key: 'costPrice', title: '원가', align: 'right', render: (val) => <span style={{ color: 'var(--color-text-sub)' }}>{won(val)}</span> },
    {
      key: 'vatApplicable',
      title: 'VAT',
      align: 'center',
      render: (val) => (
        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: val ? '#F3F4F6' : '#F9FAFB', color: val ? '#374151' : '#9CA3AF' }}>
          {val ? '적용' : '미적용'}
        </span>
      ),
    },
    {
      key: '_active',
      title: '상태',
      align: 'center',
      render: (_, row) => {
        const active = isActiveOf(row)
        return (
          <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: active ? '#F0FDF4' : '#F3F4F6', color: active ? '#16A34A' : '#9CA3AF' }}>
            {active ? '사용' : '미사용'}
          </span>
        )
      },
    },
    {
      key: '_actions',
      title: '관리',
      align: 'center',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row) }}>수정</Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onToggleActive(row) }}>{isActiveOf(row) ? '비활성화' : '활성화'}</Button>
          <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(row) }}>삭제</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumbs={['제품', '제품 관리']}
        title="제품 관리"
        actions={
          <>
            <Button variant="ghost" onClick={exportCsv}>엑셀 다운로드</Button>
            <Button variant="primary" onClick={openCreate}>+ 제품 등록</Button>
          </>
        }
      />

      <SearchPanel>
        <SearchRow label="카테고리">
          <select className="form-select" value={filter.categoryId} onChange={(e) => setFilter({ ...filter, categoryId: e.target.value })} style={{ width: '200px' }}>
            <option value="">전체</option>
            {allCats.map(c => <option key={c.id} value={c.id}>{c.path}</option>)}
          </select>
        </SearchRow>
        <SearchRow label="검색">
          <input type="text" className="form-input" value={filter.keyword} placeholder="제품명 또는 코드" onChange={(e) => setFilter({ ...filter, keyword: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && onSearch()} style={{ width: '220px' }} />
          <select className="form-select" value={filter.vat} onChange={(e) => setFilter({ ...filter, vat: e.target.value })} style={{ width: '110px' }}>
            <option value="">VAT 전체</option>
            <option value="true">적용</option>
            <option value="false">미적용</option>
          </select>
          <select className="form-select" value={filter.active} onChange={(e) => setFilter({ ...filter, active: e.target.value })} style={{ width: '110px' }}>
            <option value="">상태 전체</option>
            <option value="true">사용</option>
            <option value="false">미사용</option>
          </select>
          <Button variant="secondary" onClick={onSearch}>검색</Button>
          <Button variant="ghost" onClick={onReset}>초기화</Button>
        </SearchRow>
      </SearchPanel>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-sub)' }}>
          총 <strong style={{ color: 'var(--color-text-main)' }}>{pageData.totalElements ?? 0}</strong>개
          {vatFilter !== '' && ' (VAT 필터는 현재 페이지 기준)'}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-sub)' }}>
      <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
        <span>총 <b className="text-gray-900">{pageData.totalElements ?? 0}</b>개</span>
        <label className="flex items-center gap-2">
          페이지당
          <select className="form-select" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0) }} style={{ width: '80px', height: '32px' }}>
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}개</option>)}
          </select>
        </label>
      </div>

      {error && (
        <div role="alert" style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--color-danger)', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', padding: '10px 16px' }}>
          {error}
      {/* ── 일괄 작업 바 ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-2 bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm">
          <span className="text-blue-700 font-medium">{selectedIds.size}개 선택됨</span>
          <button onClick={onBulkActivate} className="ml-2 border border-green-300 text-green-600 px-2 py-1 rounded text-xs">일괄 활성화</button>
          <button onClick={onBulkDeactivate} className="border border-amber-300 text-amber-600 px-2 py-1 rounded text-xs">일괄 비활성화</button>
          <button onClick={onBulkDelete} className="border border-red-300 text-red-500 px-2 py-1 rounded text-xs">일괄 삭제</button>
          <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 px-2 py-1 text-xs ml-auto">선택 해제</button>
        </div>
      )}

      {error && <div className="mb-3 text-red-500 text-sm">{error}</div>}

      {/* ── 테이블 ── */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-center w-8">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              <th className="px-3 py-2 text-left">제품코드</th>
              <th className="px-3 py-2 text-left">제품</th>
              <th className="px-3 py-2 text-left">카테고리</th>
              <th className="px-3 py-2 text-right">단가</th>
              <th className="px-3 py-2 text-right">원가</th>
              <th className="px-3 py-2 text-center">VAT</th>
              <th className="px-3 py-2 text-center">상태</th>
              <th className="px-3 py-2 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center text-gray-400 py-10">불러오는 중…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-gray-400 py-10">제품이 없습니다</td></tr>
            ) : rows.map(p => (
              <tr key={p.id} className={`border-t hover:bg-gray-50 ${selectedIds.has(p.id) ? 'bg-blue-50/50' : ''}`}>
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)} />
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">{p.code}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Thumb src={p.imageUrl} />
                    <div>
                      <div className="font-medium">{p.name}</div>
                      {p.spec && <div className="text-xs text-gray-400">{p.spec}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-600">{catLabel(p)}</td>
                <td className="px-3 py-2 text-right">{won(p.unitPrice)}</td>
                <td className="px-3 py-2 text-right text-gray-400">{won(p.costPrice)}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded ${p.vatApplicable ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
                    {p.vatApplicable ? '적용' : '미적용'}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded ${isActiveOf(p) ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {isActiveOf(p) ? '사용' : '미사용'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => openEdit(p)} className="text-blue-600 text-xs px-2 py-1">수정</button>
                    <button onClick={() => onToggleActive(p)} className="text-amber-600 text-xs px-2 py-1">
                      {isActiveOf(p) ? '비활성화' : '활성화'}
                    </button>
                    <button onClick={() => onDelete(p)} className="text-red-500 text-xs px-2 py-1">삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 페이징 ── */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          <PageBtn disabled={page === 0} onClick={() => setPage(page - 1)}>이전</PageBtn>
          {Array.from({ length: totalPages }, (_, i) => i)
            .filter(i => Math.abs(i - page) <= 2 || i === 0 || i === totalPages - 1)
            .map((i, idx, arr) => (
              <span key={i} className="flex">
                {idx > 0 && arr[idx - 1] !== i - 1 && <span className="px-1 text-gray-300">…</span>}
                <PageBtn active={i === page} onClick={() => setPage(i)}>{i + 1}</PageBtn>
              </span>
            ))}
          <PageBtn disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>다음</PageBtn>
        </div>
      )}

      <DataTable columns={columns} data={rows} rowKey="id" loading={loading} emptyText="제품이 없습니다." />

      <Pagination page={page} totalPages={pageData.totalPages ?? 0} onPageChange={setPage} />

      {/* 등록/수정 모달 */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}
          onClick={() => setModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>제품 {editId == null ? '등록' : '수정'}</h2>
            {modalError && <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--color-danger)', background: '#FEF2F2', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>{modalError}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <ModalRow label="제품코드 *">
                <input className="form-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="예: WM-1024" />
              </ModalRow>
              <ModalRow label="제품명 *">
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 드럼 세탁기 12kg" />
              </ModalRow>
              <ModalRow label="카테고리 *">
                <select className="form-select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">선택</option>
                  {leafCats.map(c => <option key={c.id} value={c.id}>{c.path}</option>)}
                </select>
              </Row>
              <Row label="규격">
                <input className="border px-3 py-2 rounded w-full" value={form.spec}
                  onChange={e => setForm({ ...form, spec: e.target.value })} placeholder="예: 600x850x600mm" />
              </Row>
              <Row label="단가 *">
                <input type="number" min="0" className="border px-3 py-2 rounded w-full" value={form.unitPrice}
                  onChange={e => setForm({ ...form, unitPrice: e.target.value })} placeholder="0" />
              </Row>
              <Row label="원가 *">
                <input type="number" min="0" className="border px-3 py-2 rounded w-full" value={form.costPrice}
                  onChange={e => setForm({ ...form, costPrice: e.target.value })} placeholder="0" />
              </Row>
              <Row label="단위">
                <input className="border px-3 py-2 rounded w-full" value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="EA" />
              </Row>
              <Row label="VAT">
                <div className="flex gap-4 items-center h-full">
                  <label className="flex items-center gap-1 text-sm">
                    <input type="radio" checked={form.vatApplicable === true}
                      onChange={() => setForm({ ...form, vatApplicable: true })} /> 적용
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    <input type="radio" checked={form.vatApplicable === false}
                      onChange={() => setForm({ ...form, vatApplicable: false })} /> 미적용
                  </label>
              </ModalRow>
              <ModalRow label="규격">
                <input className="form-input" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} placeholder="예: 600x850x600mm" />
              </ModalRow>
              <ModalRow label="단가">
                <input type="number" className="form-input" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} placeholder="0" />
              </ModalRow>
              <ModalRow label="원가">
                <input type="number" className="form-input" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="0" />
              </ModalRow>
              <ModalRow label="단위">
                <input className="form-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="EA" />
              </ModalRow>
              <ModalRow label="VAT">
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', height: '40px' }}>
                  <label className="form-checkbox"><input type="radio" checked={form.vatApplicable === true} onChange={() => setForm({ ...form, vatApplicable: true })} />적용</label>
                  <label className="form-checkbox"><input type="radio" checked={form.vatApplicable === false} onChange={() => setForm({ ...form, vatApplicable: false })} />미적용</label>
                </div>
              </ModalRow>
            </div>

            <div style={{ marginTop: '16px' }}>
              <ModalRow label="설명">
                <textarea className="form-textarea" style={{ height: '80px' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="제품 설명 (선택)" />
              </ModalRow>
            </div>
            <div style={{ marginTop: '16px' }}>
              <ModalRow label="이미지 URL">
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <input className="form-input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" style={{ flex: 1 }} />
                  <Thumb src={form.imageUrl} size={56} />
                </div>
              </ModalRow>
            </div>

            {editId != null && (
              <div style={{ marginTop: '16px' }}>
                <ModalRow label="사용 상태">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })}
                      style={{ position: 'relative', width: '44px', height: '24px', borderRadius: '12px', background: form.isActive ? 'var(--color-primary)' : '#D1D5DB', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <span style={{ position: 'absolute', top: '2px', left: form.isActive ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </button>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-sub)' }}>{form.isActive ? '사용 중' : '미사용'}</span>
                  </div>
                </ModalRow>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>취소</Button>
              <Button variant="primary" onClick={onSubmit}>저장</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 헬퍼 ──
// 백엔드 boolean isActive → Jackson이 JSON 키 "active"로 직렬화하므로 둘 다 수용
function isActiveOf(p) {
  return p?.isActive ?? p?.active ?? false
}

// 카테고리 트리에서 말단(자식 없는) 노드만 평탄화 + 전체 경로 라벨
function flattenLeaves(tree) {
  const out = []
  const walk = (nodes, path) => {
    for (const n of nodes ?? []) {
      const p = [...path, n.name]
      if (n.children?.length) walk(n.children, p)
      else out.push({ id: n.id, path: p.join(' > ') })
    }
  }
  walk(tree, [])
  return out
}

// 카테고리 트리 전체(대/중/소) 평탄화 + 전체 경로 라벨 (검색 필터용)
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

function won(v) {
  if (v == null || v === '') return '-'
  return Number(v).toLocaleString('ko-KR') + '원'
}

function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function Thumb({ src, size = 36 }) {
  if (!src) {
    return <div style={{ width: size, height: size }}
      className="bg-gray-100 rounded text-gray-300 flex items-center justify-center text-xs shrink-0">無</div>
  }
  return <img src={src} alt="" style={{ width: size, height: size }}
    className="rounded object-cover border shrink-0"
    onError={e => { e.currentTarget.style.display = 'none' }} />
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
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
