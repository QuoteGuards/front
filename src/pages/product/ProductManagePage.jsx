import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getProductsApi,
  createProductApi,
  updateProductApi,
  activateProductApi,
  deactivateProductApi,
  deleteProductApi,
  bulkActivateProductsApi,
  bulkDeactivateProductsApi,
  bulkDeleteProductsApi,
  uploadProductImageApi,
} from '../../api/productApi'
import { getCategoriesApi } from '../../api/categoryApi'
import PageHeader from '../../components/common/PageHeader'
import SearchPanel, { SearchRow } from '../../components/common/SearchPanel'
import SearchableSelect from '../../components/common/SearchableSelect'
import SegmentedControl from '../../components/common/SegmentedControl'
import DataTable from '../../components/common/DataTable'
import Button from '../../components/common/Button'
import Pagination from '../../components/common/Pagination'

const VAT_FILTER_OPTIONS = [
  { value: '', label: 'VAT 전체' },
  { value: 'true', label: '적용' },
  { value: 'false', label: '미적용' },
]

const ACTIVE_FILTER_OPTIONS = [
  { value: '', label: '상태 전체' },
  { value: 'true', label: '사용' },
  { value: 'false', label: '미사용' },
]

const VAT_MODAL_OPTIONS = [
  { value: true, label: '적용' },
  { value: false, label: '미적용' },
]

const PAGE_SIZES = [10, 20, 50]

const EMPTY_FORM = {
  code: '',
  name: '',
  categoryId: '',
  description: '',
  imageUrl: '',
  unitPrice: '',
  costPrice: '',
  unit: 'EA',
  spec: '',
  vatApplicable: true,
  isActive: true,
}

export default function ProductManagePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initCategoryId = searchParams.get('categoryId') ?? ''

  const [filter, setFilter] = useState({
    categoryId: initCategoryId,
    keyword: '',
    vat: '',
    active: '',
  })

  const [applied, setApplied] = useState({
    categoryId: initCategoryId,
    keyword: '',
    vat: '',
    active: '',
  })

  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [sort, setSort] = useState('createdAt,desc') // 정렬 (즉시 적용)
  const [pageData, setPageData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 0,
  })

  const [leafCats, setLeafCats] = useState([])
  const [allCats, setAllCats] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [modalError, setModalError] = useState(null)
  const [uploading, setUploading] = useState(false) // 이미지 업로드 중
  const uploadSession = useRef(0) // 모달 세션 토큰 — 늦게 도착한 업로드가 다른 세션에 쓰는 것 방지
  const fileInputRef = useRef(null) // 파일 input (버튼으로 트리거)

  useEffect(() => {
    let ignore = false

    getCategoriesApi()
        .then((tree) => {
          if (ignore) return

          setLeafCats(flattenLeaves(tree))
          setAllCats(flattenAll(tree))
        })
        .catch((e) => {
          if (ignore) return

          setError(e.response?.data?.message ?? '카테고리 목록을 불러오지 못했습니다.')
        })

    return () => {
      ignore = true
    }
  }, [])

  const buildParams = (base) => {
    const params = { ...base }

    if (applied.categoryId) params.categoryId = applied.categoryId
    if (applied.keyword) params.keyword = applied.keyword
    if (applied.active !== '') params.isActive = applied.active === 'true'
    if (applied.vat !== '') params.vatApplicable = applied.vat === 'true'
    if (sort) params.sort = sort

    return params
  }

  const load = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getProductsApi(buildParams({ page, size }))
      setPageData(data)
      setSelectedIds(new Set())
    } catch (e) {
      setError(e.response?.data?.message ?? '제품 목록 조회 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false

    Promise.resolve()
        .then(async () => {
          if (ignore) return

          setLoading(true)
          setError(null)

          try {
            const data = await getProductsApi(buildParams({ page, size }))

            if (ignore) return

            setPageData(data)
            setSelectedIds(new Set())
          } catch (e) {
            if (ignore) return

            setError(e.response?.data?.message ?? '제품 목록 조회 실패')
          } finally {
            if (!ignore) {
              setLoading(false)
            }
          }
        })

    return () => {
      ignore = true
    }
  }, [applied, page, size, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = () => {
    setApplied({
      categoryId: filter.categoryId,
      keyword: filter.keyword.trim(),
      vat: filter.vat,
      active: filter.active,
    })
    setPage(0)
  }

  const onReset = () => {
    setFilter({
      categoryId: '',
      keyword: '',
      vat: '',
      active: '',
    })

    setApplied({
      categoryId: '',
      keyword: '',
      vat: '',
      active: '',
    })

    setPage(0)

    if (searchParams.toString()) {
      setSearchParams({})
    }
  }

  const rows = pageData.content ?? []

  const catLabel = (product) => {
    return allCats.find((category) => category.id === product.categoryId)?.path ?? product.categoryName ?? ''
  }

  const openCreate = () => {
    uploadSession.current += 1 // 새 모달 세션 → 이전 업로드 무효화
    setUploading(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setModalError(null)
    setModalOpen(true)
  }

  const openEdit = (product) => {
    uploadSession.current += 1 // 새 모달 세션 → 이전 업로드 무효화
    setUploading(false)
    setEditId(product.id)
    setForm({
      code: product.code,
      name: product.name,
      categoryId: product.categoryId ?? '',
      description: product.description ?? '',
      imageUrl: product.imageUrl ?? '',
      unitPrice: product.unitPrice ?? '',
      costPrice: product.costPrice ?? '',
      unit: product.unit ?? 'EA',
      spec: product.spec ?? '',
      vatApplicable: product.vatApplicable,
      isActive: isActiveOf(product),
    })
    setModalError(null)
    setModalOpen(true)
  }

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일 재선택 허용 (file은 위에서 캡처됨)
    if (!file) return

    // 업로드 전 클라이언트 검증 — 서버도 동일 검증하지만 즉시 피드백 + 불필요한 업로드 방지
    if (!file.type.startsWith('image/')) {
      setModalError('이미지 파일만 업로드할 수 있습니다.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setModalError('파일 크기가 너무 큽니다. (최대 5MB)')
      return
    }

    const session = uploadSession.current // 이 업로드가 속한 모달 세션
    setModalError(null)
    setUploading(true)
    try {
      const url = await uploadProductImageApi(file)
      if (uploadSession.current !== session) return // 모달이 닫히거나 다른 제품으로 전환됨 → 폐기
      setForm((f) => ({ ...f, imageUrl: url }))
    } catch (err) {
      if (uploadSession.current !== session) return
      setModalError(err.response?.data?.message ?? '이미지 업로드 실패')
    } finally {
      if (uploadSession.current === session) setUploading(false)
    }
  }

  const onSubmit = async () => {
    setModalError(null)

    if (uploading) {
      setModalError('이미지 업로드 중입니다. 완료 후 저장하세요.')
      return
    }

    if (!form.code.trim() || !form.name.trim() || !form.categoryId) {
      setModalError('제품코드, 제품명, 카테고리는 필수입니다.')
      return
    }

    if (form.unitPrice === '' || form.costPrice === '') {
      setModalError('단가와 원가를 입력하세요.')
      return
    }

    const unitPriceNum = Number(form.unitPrice)
    const costPriceNum = Number(form.costPrice)

    if (
        !Number.isFinite(unitPriceNum) ||
        !Number.isFinite(costPriceNum) ||
        unitPriceNum < 0 ||
        costPriceNum < 0
    ) {
      setModalError('단가·원가는 0 이상의 유효한 숫자여야 합니다.')
      return
    }

    if (costPriceNum > unitPriceNum) {
      setModalError('원가가 단가보다 클 수 없습니다.')
      return
    }

    const payload = {
      categoryId: Number(form.categoryId),
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description?.trim() || null,
      spec: form.spec?.trim() || null,
      imageUrl: form.imageUrl?.trim() || null,
      unitPrice: unitPriceNum,
      costPrice: costPriceNum,
      unit: form.unit?.trim() || 'EA',
      vatApplicable: form.vatApplicable,
    }

    try {
      let saved

      if (editId == null) {
        saved = await createProductApi(payload)
      } else {
        saved = await updateProductApi(editId, payload)
      }

      if (editId != null && isActiveOf(saved) !== form.isActive) {
        if (form.isActive) {
          await activateProductApi(editId)
        } else {
          await deactivateProductApi(editId)
        }
      }

      setModalOpen(false)
      await load()
    } catch (e) {
      setModalError(e.response?.data?.message ?? '저장 실패 (제품코드 중복/형식 확인)')
    }
  }

  const onToggleActive = async (product) => {
    try {
      if (isActiveOf(product)) {
        await deactivateProductApi(product.id)
      } else {
        await activateProductApi(product.id)
      }

      await load()
    } catch (e) {
      setError(e.response?.data?.message ?? '상태 변경 실패')
    }
  }

  const onDelete = async (product) => {
    if (!confirm(`'${product.name}' 삭제할까요? (견적에 연결된 제품은 삭제 불가)`)) return

    try {
      await deleteProductApi(product.id)
      await load()
    } catch (e) {
      setError(e.response?.data?.message ?? '삭제 실패')
    }
  }

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }

  const allChecked = rows.length > 0 && rows.every((product) => selectedIds.has(product.id))

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(rows.map((product) => product.id)))
    }
  }

  const runBulk = async (fn, label) => {
    const ids = [...selectedIds]

    if (ids.length === 0) return

    if (label === '삭제' && !confirm(`선택한 ${ids.length}개 제품을 삭제할까요? (견적 연결 제품은 실패)`)) {
      return
    }

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

  const exportCsv = async () => {
    setError(null)

    try {
      const exportCap = 10000
      const total = pageData.totalElements ?? 0

      if (
          total > exportCap &&
          !confirm(
              `검색 결과가 ${total.toLocaleString('ko-KR')}개입니다. 처음 ${exportCap.toLocaleString(
                  'ko-KR',
              )}개만 내보냅니다. 계속할까요?`,
          )
      ) {
        return
      }

      const data = await getProductsApi(
          buildParams({
            page: 0,
            size: Math.min(Math.max(total, 1), exportCap),
          }),
      )

      const list = data.content ?? []

      if (list.length === 0) {
        alert('내보낼 제품이 없습니다.')
        return
      }

      const header = ['제품코드', '제품명', '규격', '카테고리', '단가', '원가', '마진율', 'VAT', '상태']

      const lines = list.map((product) => {
        const rate = marginRate(product)
        return [
          product.code,
          product.name,
          product.spec ?? '',
          catLabel(product),
          product.unitPrice,
          product.costPrice,
          rate == null ? '-' : `${rate.toFixed(1)}%`,
          product.vatApplicable ? '적용' : '미적용',
          isActiveOf(product) ? '사용' : '미사용',
        ]
            .map(csvCell)
            .join(',')
      })

      const csv = '\uFEFF' + [header.join(','), ...lines].join('\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
      const a = document.createElement('a')

      a.href = url
      a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()

      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.response?.data?.message ?? '엑셀 다운로드 실패')
    }
  }

  const columns = [
    {
      key: '_select',
      title: <input type="checkbox" checked={allChecked} onChange={toggleAll} />,
      align: 'center',
      render: (_, row) => (
          <input
              type="checkbox"
              checked={selectedIds.has(row.id)}
              onChange={() => toggleOne(row.id)}
              onClick={(e) => e.stopPropagation()}
          />
      ),
    },
    {
      key: 'code',
      title: '제품코드',
      render: (value) => (
          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-text-sub)' }}>
          {value}
        </span>
      ),
    },
    {
      key: 'name',
      title: '제품명',
      render: (value, row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Thumb src={row.imageUrl} />

            <div>
              <div style={{ fontWeight: 500 }}>{value}</div>
              {row.spec && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{row.spec}</div>}
            </div>
          </div>
      ),
    },
    {
      key: '_cat',
      title: '카테고리',
      render: (_, row) => <span style={{ color: 'var(--color-text-sub)' }}>{catLabel(row)}</span>,
    },
    {
      key: 'unitPrice',
      title: '단가',
      align: 'right',
      render: (value) => <span style={{ fontWeight: 500 }}>{won(value)}</span>,
    },
    {
      key: 'costPrice',
      title: '원가',
      align: 'right',
      render: (value) => <span style={{ color: 'var(--color-text-sub)' }}>{won(value)}</span>,
    },
    {
      key: '_margin',
      title: '마진율',
      align: 'right',
      render: (_, row) => {
        const rate = marginRate(row)
        if (rate == null) return <span style={{ color: 'var(--color-text-muted)' }}>-</span>
        return (
          <span style={{ color: rate < 0 ? 'var(--color-danger)' : 'var(--color-text-main)', fontWeight: 500 }}>
            {rate.toFixed(1)}%
          </span>
        )
      },
    },
    {
      key: 'vatApplicable',
      title: 'VAT',
      align: 'center',
      render: (value) => (
          <span
              style={{
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: value ? '#F3F4F6' : '#F9FAFB',
                color: value ? '#374151' : '#9CA3AF',
              }}
          >
          {value ? '적용' : '미적용'}
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
            <span
                style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: active ? '#F0FDF4' : '#F3F4F6',
                  color: active ? '#16A34A' : '#9CA3AF',
                }}
            >
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
            <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  openEdit(row)
                }}
            >
              수정
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleActive(row)
                }}
            >
              {isActiveOf(row) ? '비활성화' : '활성화'}
            </Button>

            <Button
                variant="danger"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(row)
                }}
            >
              삭제
            </Button>
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
                <Button variant="ghost" onClick={exportCsv}>
                  엑셀 다운로드
                </Button>
                <Button variant="primary" onClick={openCreate}>
                  + 제품 등록
                </Button>
              </>
            }
        />

        <SearchPanel>
          <SearchRow label="카테고리">
            <SearchableSelect width="240px" value={filter.categoryId} placeholder="전체"
              options={[{ value: '', label: '전체' }, ...allCats.map((c) => ({ value: c.id, label: c.path }))]}
              onChange={(v) => setFilter({ ...filter, categoryId: v })} />
          </SearchRow>

          <SearchRow label="검색">
            <input
                type="text"
                className="form-input"
                value={filter.keyword}
                placeholder="제품명 또는 코드"
                onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                style={{ width: '220px' }}
            />

            <SegmentedControl
              variant="toggle"
              name="vat-filter"
              options={VAT_FILTER_OPTIONS}
              value={filter.vat}
              onChange={(v) => setFilter({ ...filter, vat: v })}
            />

            <SegmentedControl
              variant="toggle"
              name="active-filter"
              options={ACTIVE_FILTER_OPTIONS}
              value={filter.active}
              onChange={(v) => setFilter({ ...filter, active: v })}
            />

            <Button variant="secondary" onClick={onSearch}>
              검색
            </Button>
            <Button variant="ghost" onClick={onReset}>
              초기화
            </Button>
          </SearchRow>
        </SearchPanel>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-sub)' }}>
          총 <strong style={{ color: 'var(--color-text-main)' }}>{pageData.totalElements ?? 0}</strong>개
        </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-sub)' }}>
              정렬
              <select
                  className="form-select"
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(0) }}
                  style={{ width: '150px', height: '32px' }}
              >
                <option value="createdAt,desc">등록 최신순</option>
                <option value="createdAt,asc">등록 오래된순</option>
                <option value="name,asc">제품명 가나다순</option>
                <option value="unitPrice,desc">단가 높은순</option>
                <option value="unitPrice,asc">단가 낮은순</option>
              </select>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-sub)' }}>
              페이지당
              <select
                  className="form-select"
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value))
                    setPage(0)
                  }}
                  style={{ width: '80px', height: '32px' }}
              >
                {PAGE_SIZES.map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}개
                    </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {selectedIds.size > 0 && (
            <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  fontSize: '13px',
                }}
            >
              <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{selectedIds.size}개 선택됨</span>
              <Button variant="outline" size="sm" onClick={onBulkActivate}>일괄 활성화</Button>
              <Button variant="outline" size="sm" onClick={onBulkDeactivate}>일괄 비활성화</Button>
              <Button variant="danger" size="sm" onClick={onBulkDelete}>일괄 삭제</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>선택 해제</Button>
            </div>
        )}

        {error && (
            <div role="alert"
                style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--color-danger)', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', padding: '10px 16px' }}>
              {error}
            </div>
        )}

        <DataTable columns={columns} data={rows} rowKey="id" loading={loading} emptyText="제품이 없습니다." />

        <Pagination page={page} totalPages={pageData.totalPages ?? 0} onChange={setPage} />

        {modalOpen && (
            <div
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}
                onClick={() => setModalOpen(false)}
            >
              <div
                  style={{ background: '#FFFFFF', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}
                  onClick={(e) => e.stopPropagation()}
              >
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
                  제품 {editId == null ? '등록' : '수정'}
                </h2>

                {modalError && (
                    <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--color-danger)', background: '#FEF2F2', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                      {modalError}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <ModalRow label="제품코드 *">
                    <input className="form-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="예: WM-1024" />
                  </ModalRow>
                  <ModalRow label="제품명 *">
                    <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 드럼 세탁기 12kg" />
                  </ModalRow>
                  <ModalRow label="카테고리 *">
                    <SearchableSelect value={form.categoryId} placeholder="카테고리 선택"
                      options={leafCats.map((c) => ({ value: c.id, label: c.path }))}
                      onChange={(v) => setForm({ ...form, categoryId: v })} />
                  </ModalRow>
                  <ModalRow label="규격">
                    <input className="form-input" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} placeholder="예: 600x850x600mm" />
                  </ModalRow>
                  <ModalRow label="단가 *">
                    <input type="number" min="0" className="form-input" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} placeholder="0" />
                  </ModalRow>
                  <ModalRow label="원가 *">
                    <input type="number" min="0" className="form-input" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="0" />
                  </ModalRow>
                  <ModalRow label="단위">
                    <input className="form-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="EA" />
                  </ModalRow>
                  <ModalRow label="VAT">
                    <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
                      <SegmentedControl
                        variant="toggle"
                        name="modal-vat"
                        options={VAT_MODAL_OPTIONS}
                        value={form.vatApplicable}
                        onChange={(v) => setForm({ ...form, vatApplicable: v })}
                      />
                    </div>
                  </ModalRow>
                </div>

                {(() => {
                  const rate = (form.unitPrice !== '' && form.costPrice !== '') ? marginRate(form) : null
                  if (rate == null) return null
                  return (
                    <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--color-text-sub)' }}>
                      예상 마진율 <b style={{ color: rate < 0 ? 'var(--color-danger)' : 'var(--color-primary)' }}>{rate.toFixed(1)}%</b>
                      {rate < 0 && <span style={{ color: 'var(--color-danger)', marginLeft: '6px' }}>※ 원가가 단가보다 높습니다</span>}
                    </div>
                  )
                })()}

                <div style={{ marginTop: '16px' }}>
                  <ModalRow label="설명">
                    <textarea className="form-textarea" style={{ height: '80px' }} value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="제품 설명 (선택)" />
                  </ModalRow>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <ModalRow label="이미지">
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                            className="form-input"
                            value={form.imageUrl}
                            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                            placeholder="파일 업로드 또는 https:// URL 직접 입력"
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button type="button" className="btn btn--outline btn--sm" disabled={uploading}
                              onClick={() => fileInputRef.current?.click()}>
                            {uploading ? '업로드 중…' : '파일 선택'}
                          </button>
                          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onPickImage} />
                          {form.imageUrl && !uploading && (
                            <button type="button" onClick={() => setForm({ ...form, imageUrl: '' })}
                                style={{ fontSize: '12px', color: 'var(--color-text-sub)', background: 'none', border: 'none', cursor: 'pointer' }}>
                              이미지 제거
                            </button>
                          )}
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>JPG·PNG 등, 최대 5MB</span>
                        </div>
                      </div>
                      <Thumb src={form.imageUrl} size={56} />
                    </div>
                  </ModalRow>
                </div>

                {editId != null && (
                    <div style={{ marginTop: '16px' }}>
                      <ModalRow label="사용 상태">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button type="button"
                              onClick={() => setForm({ ...form, isActive: !form.isActive })}
                              aria-label={form.isActive ? '사용 중 — 클릭하면 미사용으로 변경' : '미사용 — 클릭하면 사용으로 변경'}
                              aria-pressed={form.isActive}
                              style={{ position: 'relative', width: '44px', height: '24px', borderRadius: '12px', background: form.isActive ? 'var(--color-primary)' : '#D1D5DB', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                          >
                            <span style={{ position: 'absolute', top: '2px', left: form.isActive ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.2s' }} />
                          </button>
                          <span style={{ fontSize: '13px', color: 'var(--color-text-sub)' }}>{form.isActive ? '사용 중' : '미사용'}</span>
                        </div>
                      </ModalRow>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>
                    취소
                  </Button>
                  <Button variant="primary" onClick={onSubmit} disabled={uploading}>
                    {uploading ? '업로드 중…' : '저장'}
                  </Button>
                </div>
              </div>
            </div>
        )}
      </div>
  )
}

function isActiveOf(product) {
  return product?.isActive ?? product?.active ?? false
}

function flattenLeaves(tree) {
  const out = []
  const walk = (nodes, path) => {
    for (const node of nodes ?? []) {
      const nextPath = [...path, node.name]
      if (node.children?.length) { walk(node.children, nextPath) }
      else { out.push({ id: node.id, path: nextPath.join(' > ') }) }
    }
  }
  walk(tree, [])
  return out
}

function flattenAll(tree) {
  const out = []
  const walk = (nodes, path) => {
    for (const node of nodes ?? []) {
      const nextPath = [...path, node.name]
      out.push({ id: node.id, path: nextPath.join(' > ') })
      if (node.children?.length) { walk(node.children, nextPath) }
    }
  }
  walk(tree, [])
  return out
}

function won(value) {
  if (value == null || value === '') return '-'
  return `${Number(value).toLocaleString('ko-KR')}원`
}

function marginRate(product) {
  const u = Number(product?.unitPrice)
  const c = Number(product?.costPrice)
  if (!Number.isFinite(u) || u <= 0) return null
  if (!Number.isFinite(c) || c < 0) return null
  return ((u - c) / u) * 100
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
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
      <img src={src} alt=""
          style={{ width: size, height: size, borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--color-border)', flexShrink: 0 }}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
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
