import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getProductsApi, createProductApi, updateProductApi,
  activateProductApi, deactivateProductApi, deleteProductApi,
} from '../../api/productApi'
import { getCategoriesApi } from '../../api/categoryApi'

const PAGE_SIZES = [10, 20, 50]
const EMPTY_FORM = {
  code: '', name: '', categoryId: '', description: '', imageUrl: '',
  unitPrice: '', costPrice: '', unit: 'EA', spec: '', vatApplicable: true, isActive: true,
}

export default function ProductManagePage() {
  // 카테고리 관리 화면에서 "제품 목록 보기"로 넘어올 때 ?categoryId= 로 초기 필터 지정
  const [searchParams] = useSearchParams()
  const initCategoryId = searchParams.get('categoryId') ?? ''
  // 검색 필터 (입력값)
  const [filter, setFilter] = useState({ categoryId: initCategoryId, keyword: '', vat: '', active: '' })
  // 실제 적용된 필터 (검색 버튼 눌렀을 때만 반영)
  const [applied, setApplied] = useState({ categoryId: initCategoryId, keyword: '', active: '' })
  const [vatFilter, setVatFilter] = useState('') // VAT는 백엔드 미지원 → 클라 필터

  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [pageData, setPageData] = useState({ content: [], totalElements: 0, totalPages: 0 })
  const [leafCats, setLeafCats] = useState([]) // 소분류(말단) — 등록/수정 모달용
  const [allCats, setAllCats] = useState([])   // 대/중/소 전체 — 검색 필터용(자손 매칭)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // 모달
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)       // null이면 등록
  const [form, setForm] = useState(EMPTY_FORM)
  const [modalError, setModalError] = useState(null)

  // 카테고리 트리 로드 → 모달용(말단)/필터용(전체) 평탄화
  useEffect(() => {
    getCategoriesApi().then(tree => {
      setLeafCats(flattenLeaves(tree))
      setAllCats(flattenAll(tree))
    }).catch(() => {})
  }, [])

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const params = { page, size }
      if (applied.categoryId) params.categoryId = applied.categoryId
      if (applied.keyword) params.keyword = applied.keyword
      if (applied.active !== '') params.isActive = applied.active === 'true'
      const data = await getProductsApi(params)
      setPageData(data)
    } catch (e) {
      setError(e.response?.data?.message ?? '제품 목록 조회 실패')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [applied, page, size]) // eslint-disable-line

  const onSearch = () => {
    setApplied({ categoryId: filter.categoryId, keyword: filter.keyword.trim(), active: filter.active })
    setVatFilter(filter.vat)
    setPage(0)
  }
  const onReset = () => {
    setFilter({ categoryId: '', keyword: '', vat: '', active: '' })
    setApplied({ categoryId: '', keyword: '', active: '' })
    setVatFilter('')
    setPage(0)
  }

  // VAT는 백엔드 필터가 없어 현재 페이지에서 클라이언트 필터
  const rows = useMemo(() => {
    let list = pageData.content ?? []
    if (vatFilter !== '') list = list.filter(p => p.vatApplicable === (vatFilter === 'true'))
    return list
  }, [pageData, vatFilter])

  // 카테고리 전체 경로 라벨 (전체 목록에 없으면 백엔드 categoryName 폴백)
  const catLabel = (p) => allCats.find(c => c.id === p.categoryId)?.path ?? p.categoryName ?? ''

  // ── 모달 열기 ──
  const openCreate = () => {
    setEditId(null); setForm(EMPTY_FORM); setModalError(null); setModalOpen(true)
  }
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
    const payload = {
      categoryId: Number(form.categoryId),
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description?.trim() || null,
      spec: form.spec?.trim() || null,
      imageUrl: form.imageUrl?.trim() || null,
      unitPrice: form.unitPrice === '' ? 0 : Number(form.unitPrice),
      costPrice: form.costPrice === '' ? 0 : Number(form.costPrice),
      unit: form.unit?.trim() || 'EA',
      vatApplicable: form.vatApplicable,
    }
    try {
      let saved
      if (editId == null) saved = await createProductApi(payload)
      else saved = await updateProductApi(editId, payload)
      // 등록/수정과 상태(활성화)는 별도 API → 수정 시 상태가 바뀌었으면 반영
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
      setError(e.response?.data?.message ?? '삭제 실패 (견적 연결 제품 확인)')
    }
  }

  const exportCsv = () => {
    const header = ['제품코드', '제품명', '규격', '카테고리', '단가', '원가', 'VAT', '상태']
    const lines = rows.map(p => [
      p.code, p.name, p.spec ?? '', catLabel(p),
      p.unitPrice, p.costPrice, p.vatApplicable ? '적용' : '미적용', isActiveOf(p) ? '사용' : '미사용',
    ].map(csvCell).join(','))
    const csv = '﻿' + [header.join(','), ...lines].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url; a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const totalPages = pageData.totalPages ?? 0

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">제품 관리</h1>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="border px-3 py-1.5 rounded text-sm">엑셀 다운로드</button>
          <button onClick={openCreate} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">+ 제품 등록</button>
        </div>
      </div>

      {/* ── 검색 필터 바 ── */}
      <div className="border rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <Field label="카테고리">
          <select className="border px-2 py-2 rounded w-full" value={filter.categoryId}
            onChange={e => setFilter({ ...filter, categoryId: e.target.value })}>
            <option value="">전체</option>
            {allCats.map(c => <option key={c.id} value={c.id}>{c.path}</option>)}
          </select>
        </Field>
        <Field label="제품명 / 제품코드">
          <input className="border px-2 py-2 rounded w-full" value={filter.keyword}
            placeholder="제품명 또는 코드"
            onChange={e => setFilter({ ...filter, keyword: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && onSearch()} />
        </Field>
        <Field label="VAT">
          <select className="border px-2 py-2 rounded w-full" value={filter.vat}
            onChange={e => setFilter({ ...filter, vat: e.target.value })}>
            <option value="">전체</option>
            <option value="true">적용</option>
            <option value="false">미적용</option>
          </select>
        </Field>
        <Field label="사용 상태">
          <select className="border px-2 py-2 rounded w-full" value={filter.active}
            onChange={e => setFilter({ ...filter, active: e.target.value })}>
            <option value="">전체</option>
            <option value="true">사용</option>
            <option value="false">미사용</option>
          </select>
        </Field>
        <div className="flex gap-2">
          <button onClick={onSearch} className="bg-blue-600 text-white px-4 py-2 rounded text-sm flex-1">검색</button>
          <button onClick={onReset} className="border px-4 py-2 rounded text-sm">초기화</button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
        <span>총 <b className="text-gray-900">{pageData.totalElements ?? 0}</b>개{vatFilter !== '' && ' (VAT 필터는 현재 페이지 기준)'}</span>
        <label className="flex items-center gap-2">
          페이지당
          <select className="border px-2 py-1 rounded" value={size}
            onChange={e => { setSize(Number(e.target.value)); setPage(0) }}>
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}개</option>)}
          </select>
        </label>
      </div>

      {error && <div className="mb-3 text-red-500 text-sm">{error}</div>}

      {/* ── 테이블 ── */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
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
              <tr><td colSpan={8} className="text-center text-gray-400 py-10">불러오는 중…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-gray-400 py-10">제품이 없습니다</td></tr>
            ) : rows.map(p => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
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

      {/* ── 등록/수정 모달 ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-4">제품 {editId == null ? '등록' : '수정'}</h2>
            {modalError && <div className="mb-3 text-red-500 text-sm">{modalError}</div>}

            <div className="grid grid-cols-2 gap-4">
              <Row label="제품코드 *">
                <input className="border px-3 py-2 rounded w-full" value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })} placeholder="예: WM-1024" />
              </Row>
              <Row label="제품명 *">
                <input className="border px-3 py-2 rounded w-full" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: 드럼 세탁기 12kg" />
              </Row>
              <Row label="카테고리 *">
                <select className="border px-3 py-2 rounded w-full" value={form.categoryId}
                  onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">선택</option>
                  {leafCats.map(c => <option key={c.id} value={c.id}>{c.path}</option>)}
                </select>
              </Row>
              <Row label="규격">
                <input className="border px-3 py-2 rounded w-full" value={form.spec}
                  onChange={e => setForm({ ...form, spec: e.target.value })} placeholder="예: 600x850x600mm" />
              </Row>
              <Row label="단가 *">
                <input type="number" className="border px-3 py-2 rounded w-full" value={form.unitPrice}
                  onChange={e => setForm({ ...form, unitPrice: e.target.value })} placeholder="0" />
              </Row>
              <Row label="원가 *">
                <input type="number" className="border px-3 py-2 rounded w-full" value={form.costPrice}
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
                </div>
              </Row>
            </div>

            <div className="mt-4">
              <Row label="설명">
                <textarea className="border px-3 py-2 rounded w-full h-20" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} placeholder="제품 설명 (선택)" />
              </Row>
            </div>

            <div className="mt-4">
              <Row label="이미지 URL">
                <div className="flex gap-3 items-start">
                  <input className="border px-3 py-2 rounded flex-1" value={form.imageUrl}
                    onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://… (업로드 기능 연동 전 임시: URL 직접 입력)" />
                  <Thumb src={form.imageUrl} size={56} />
                </div>
              </Row>
            </div>

            {editId != null && (
              <div className="mt-4">
                <Row label="사용 상태">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setForm({ ...form, isActive: !form.isActive })}
                      className={`relative w-11 h-6 rounded-full transition ${form.isActive ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition ${form.isActive ? 'translate-x-5' : ''}`} />
                    </button>
                    <span className="text-sm text-gray-600">{form.isActive ? '사용 중' : '미사용'}</span>
                  </div>
                </Row>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModalOpen(false)} className="border px-4 py-2 rounded">취소</button>
              <button onClick={onSubmit} className="bg-blue-600 text-white px-4 py-2 rounded">저장</button>
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
