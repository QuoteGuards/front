import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchProductsApi, addFavoriteApi, removeFavoriteApi } from '../../api/catalogApi'
import { getActiveCategoryTreeApi } from '../../api/categoryApi'
import PageHeader from '../../components/common/PageHeader'
import SearchPanel, { SearchRow } from '../../components/common/SearchPanel'
import Button from '../../components/common/Button'
import Pagination from '../../components/common/Pagination'
import ProductImage from '../../components/common/ProductImage'

export default function ProductSearchPage() {
  const navigate = useNavigate()

  const [keywordInput, setKeywordInput] = useState('')
  const [applied, setApplied] = useState({ keyword: '', categoryId: '', categoryName: '' })
  const [page, setPage] = useState(0)
  const [size] = useState(12)
  const [pageData, setPageData] = useState({ content: [], totalElements: 0, totalPages: 0 })
  const [tree, setTree] = useState([])
  const [expanded, setExpanded] = useState(new Set())
  const [error, setError] = useState(null)
  const [catError, setCatError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getActiveCategoryTreeApi()
      .then(data => { setTree(data); setCatError(null) })
      .catch(e => setCatError(e.response?.data?.message ?? '카테고리 조회 실패'))
  }, [])

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const params = { page, size }
      if (applied.keyword) params.keyword = applied.keyword
      if (applied.categoryId) params.categoryId = applied.categoryId
      const data = await searchProductsApi(params)
      setPageData(data)
    } catch (e) {
      setError(e.response?.data?.message ?? '제품 조회 실패')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [applied, page]) // eslint-disable-line

  const onSearch = () => {
    setApplied(a => ({ ...a, keyword: keywordInput.trim() }))
    setPage(0)
  }
  const onReset = () => {
    setKeywordInput('')
    setApplied({ keyword: '', categoryId: '', categoryName: '' })
    setPage(0)
  }
  const selectCategory = (node) => {
    setApplied(a => ({ ...a, categoryId: node.id, categoryName: node.name }))
    setPage(0)
  }
  const clearCategory = () => {
    setApplied(a => ({ ...a, categoryId: '', categoryName: '' }))
    setPage(0)
  }

  const toggleExpand = (id) => {
    const next = new Set(expanded)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpanded(next)
  }

  // 즐겨찾기 토글 (낙관적 업데이트)
  const toggleFavorite = async (p) => {
    const fav = favoriteOf(p)
    setPageData(d => ({ ...d, content: d.content.map(x => x.id === p.id ? { ...x, isFavorite: !fav, favorite: !fav } : x) }))
    try {
      fav ? await removeFavoriteApi(p.id) : await addFavoriteApi(p.id)
    } catch (e) {
      // 실패 시 롤백
      setPageData(d => ({ ...d, content: d.content.map(x => x.id === p.id ? { ...x, isFavorite: fav, favorite: fav } : x) }))
      setError(e.response?.data?.message ?? '즐겨찾기 처리 실패')
    }
  }

  const goDetail = (p) => navigate(`/catalog/${p.id}`)
  const addToQuote = (p) => navigate('/quotes/new', { state: { addProduct: p } })

  const rows = pageData.content ?? []
  const totalPages = pageData.totalPages ?? 0

  const renderCatNode = (node, depth = 0) => {
    const isOpen = expanded.has(node.id)
    const hasChild = node.children?.length > 0
    const isSel = applied.categoryId === node.id
    return (
      <div key={node.id}>
        <div className="flex items-center text-sm py-1" style={{ paddingLeft: depth * 12 }}>
          {hasChild ? (
            <button onClick={() => toggleExpand(node.id)} className="w-4 text-[var(--color-text-muted)] shrink-0">{isOpen ? '▼' : '▶'}</button>
          ) : <span className="w-4 shrink-0" />}
          <button onClick={() => selectCategory(node)}
            className="flex-1 text-left truncate"
            style={{ color: isSel ? 'var(--color-primary)' : 'var(--color-text-sub)', fontWeight: isSel ? 600 : 400 }}>
            {node.name}
            {node.productCount != null && <span className="text-[var(--color-text-muted)]"> ({node.productCount})</span>}
          </button>
        </div>
        {isOpen && hasChild && <div>{node.children.map(c => renderCatNode(c, depth + 1))}</div>}
      </div>
    )
  }

  return (
    <div>
      <PageHeader breadcrumbs={['제품', '제품 탐색']} title="제품 탐색" />

      {/* ── 검색 패널 ── */}
      <SearchPanel>
        <SearchRow label="검색">
          <input
            type="text"
            className="form-input"
            style={{ width: '320px' }}
            placeholder="제품명 / 키워드 / 제품코드로 검색"
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
          />
          <Button variant="secondary" onClick={onSearch}>검색</Button>
          <Button variant="ghost" onClick={onReset}>초기화</Button>
        </SearchRow>

        {/* 적용된 필터 칩 */}
        <SearchRow label="적용 필터">
          {applied.categoryName && (
            <Chip onRemove={clearCategory}>{applied.categoryName}</Chip>
          )}
          {applied.keyword && (
            <Chip onRemove={() => { setKeywordInput(''); setApplied(a => ({ ...a, keyword: '' })); setPage(0) }}>
              "{applied.keyword}"
            </Chip>
          )}
          {!applied.categoryName && !applied.keyword && (
            <span className="text-sm text-[var(--color-text-muted)]">없음 (전체 제품)</span>
          )}
        </SearchRow>
      </SearchPanel>

      <div className="flex gap-6">
        {/* ── 좌측 카테고리 필터 ── */}
        <aside className="w-56 shrink-0 self-start rounded-[var(--radius-md)] p-4"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-white)' }}>
          <h2 className="font-bold text-sm mb-3">카테고리 필터</h2>
          <button onClick={clearCategory}
            className="text-sm mb-2"
            style={{ color: !applied.categoryId ? 'var(--color-primary)' : 'var(--color-text-sub)', fontWeight: !applied.categoryId ? 600 : 400 }}>
            전체 제품
          </button>
          <div className="mt-1">{tree.map(n => renderCatNode(n))}</div>
          {catError
            ? <div className="text-[var(--color-danger)] text-xs py-4">{catError}</div>
            : tree.length === 0 && <div className="text-[var(--color-text-muted)] text-xs py-4">카테고리 없음</div>}
        </aside>

        {/* ── 우측 결과 ── */}
        <div className="flex-1">
          <div className="mb-3 text-sm text-[var(--color-text-sub)]">
            검색 결과 <b className="text-[var(--color-text-main)]">{pageData.totalElements ?? 0}</b>개
          </div>

          {error && (
            <div role="alert" className="mb-3 text-sm rounded-[var(--radius-sm)] px-4 py-2.5"
              style={{ color: 'var(--color-danger)', background: '#FEF2F2', border: '1px solid #FECACA' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center text-[var(--color-text-muted)] py-20">불러오는 중…</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-24 rounded-[var(--radius-md)]" style={{ border: '1px solid var(--color-border)' }}>
              <div className="text-[var(--color-text-sub)] mb-1">검색 결과가 없습니다</div>
              <div className="text-[var(--color-text-muted)] text-sm">다른 검색어나 카테고리로 다시 시도해 보세요.</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rows.map(p => (
                <div key={p.id} className="rounded-[var(--radius-md)] overflow-hidden flex flex-col"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-white)' }}>
                  {/* 이미지 + 즐겨찾기 */}
                  <div className="relative aspect-square flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                    <ProductImage src={p.imageUrl} />
                    <button onClick={() => toggleFavorite(p)}
                      className="absolute top-2 right-2 text-xl"
                      title={favoriteOf(p) ? '즐겨찾기 해제' : '즐겨찾기 등록'}
                      aria-label={favoriteOf(p) ? '즐겨찾기 해제' : '즐겨찾기 등록'}>
                      <span style={{ color: favoriteOf(p) ? 'var(--color-warning)' : '#D1D5DB' }}>★</span>
                    </button>
                  </div>

                  {/* 본문 */}
                  <div className="p-3 flex flex-col flex-1">
                    <div className="text-xs text-[var(--color-text-muted)] font-mono">{p.code}</div>
                    <div className="font-medium text-sm mt-0.5 line-clamp-2">{p.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{p.categoryName}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{won(p.unitPrice)}</span>
                      <VatBadge applicable={p.vatApplicable} />
                    </div>

                    <div className="mt-3 flex flex-col gap-1.5">
                      <Button variant="outline" size="sm" className="w-full" onClick={() => goDetail(p)}>상세 보기</Button>
                      <Button variant="primary" size="sm" className="w-full" onClick={() => addToQuote(p)}>견적에 추가</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>
    </div>
  )
}

// ── 헬퍼 ──
// isFavorite(primitive boolean) → JSON "favorite". 둘 다 수용
function favoriteOf(p) {
  return p?.isFavorite ?? p?.favorite ?? false
}
function won(v) {
  return v == null || v === '' ? '-' : Number(v).toLocaleString('ko-KR') + '원'
}

function VatBadge({ applicable }) {
  return (
    <span className="status-badge status-badge--gray" style={{ fontSize: '11px', padding: '2px 8px' }}>
      VAT {applicable ? '적용' : '미적용'}
    </span>
  )
}

function Chip({ children, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
      style={{ background: '#EEF4FF', color: 'var(--color-primary)' }}>
      {children}
      <button onClick={onRemove} aria-label="필터 제거" style={{ color: 'var(--color-primary)' }}>✕</button>
    </span>
  )
}
