import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchProductsApi, addFavoriteApi, removeFavoriteApi } from '../../api/catalogApi'
import { getActiveCategoryTreeApi } from '../../api/categoryApi'
import PageHeader from '../../components/common/PageHeader'

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
            <button onClick={() => toggleExpand(node.id)} className="w-4 text-gray-400 shrink-0">{isOpen ? '▼' : '▶'}</button>
          ) : <span className="w-4 shrink-0" />}
          <button onClick={() => selectCategory(node)}
            className={`flex-1 text-left truncate ${isSel ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}>
            {node.name}
            {node.productCount != null && <span className="text-gray-400"> ({node.productCount})</span>}
          </button>
        </div>
        {isOpen && hasChild && <div>{node.children.map(c => renderCatNode(c, depth + 1))}</div>}
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader breadcrumbs={['제품', '제품 탐색']} title="제품 탐색" />
      {/* ── 상단 검색 바 ── */}
      <div className="flex gap-2 mb-3">
        <input
          className="border px-4 py-2 rounded flex-1"
          placeholder="제품명 / 키워드 / 제품코드로 검색"
          value={keywordInput}
          onChange={e => setKeywordInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
        />
        <button onClick={onSearch} className="bg-blue-600 text-white px-6 py-2 rounded">검색</button>
        <button onClick={onReset} className="border px-6 py-2 rounded">초기화</button>
      </div>

      {/* 적용된 필터 칩 */}
      <div className="flex items-center gap-2 mb-4 text-sm min-h-[28px]">
        <span className="text-gray-400">적용된 필터:</span>
        {applied.categoryName && (
          <Chip onRemove={clearCategory}>{applied.categoryName}</Chip>
        )}
        {applied.keyword && (
          <Chip onRemove={() => { setKeywordInput(''); setApplied(a => ({ ...a, keyword: '' })); setPage(0) }}>
            "{applied.keyword}"
          </Chip>
        )}
        {!applied.categoryName && !applied.keyword && <span className="text-gray-300">없음 (전체 제품)</span>}
      </div>

      <div className="flex gap-6">
        {/* ── 좌측 카테고리 필터 ── */}
        <aside className="w-56 shrink-0 border rounded-lg p-4 self-start">
          <h2 className="font-bold text-sm mb-3">카테고리 필터</h2>
          <button onClick={clearCategory}
            className={`text-sm mb-2 ${!applied.categoryId ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
            전체 제품
          </button>
          <div className="mt-1">{tree.map(n => renderCatNode(n))}</div>
          {catError
            ? <div className="text-red-500 text-xs py-4">{catError}</div>
            : tree.length === 0 && <div className="text-gray-400 text-xs py-4">카테고리 없음</div>}
        </aside>

        {/* ── 우측 결과 ── */}
        <div className="flex-1">
          <div className="mb-3 text-sm text-gray-600">
            검색 결과 <b className="text-gray-900">{pageData.totalElements ?? 0}</b>개
          </div>

          {error && <div className="mb-3 text-red-500 text-sm">{error}</div>}

          {loading ? (
            <div className="text-center text-gray-400 py-20">불러오는 중…</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-24 border rounded-lg">
              <div className="text-gray-500 mb-1">🔍 검색 결과가 없습니다</div>
              <div className="text-gray-400 text-sm">다른 검색어나 카테고리로 다시 시도해 보세요.</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rows.map(p => (
                <div key={p.id} className="border rounded-lg overflow-hidden flex flex-col">
                  {/* 이미지 + 즐겨찾기 */}
                  <div className="relative bg-gray-100 aspect-square flex items-center justify-center">
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover"
                          onError={e => { e.currentTarget.style.display = 'none' }} />
                      : <span className="text-gray-300 text-sm">이미지</span>}
                    <button onClick={() => toggleFavorite(p)}
                      className="absolute top-2 right-2 text-xl"
                      title={favoriteOf(p) ? '즐겨찾기 해제' : '즐겨찾기 등록'}>
                      <span className={favoriteOf(p) ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                    </button>
                  </div>

                  {/* 본문 */}
                  <div className="p-3 flex flex-col flex-1">
                    <div className="text-xs text-gray-400 font-mono">{p.code}</div>
                    <div className="font-medium text-sm mt-0.5 line-clamp-2">{p.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.categoryName}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-blue-600 font-bold">{won(p.unitPrice)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.vatApplicable ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                        VAT {p.vatApplicable ? '적용' : '미적용'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-col gap-1.5">
                      <button onClick={() => goDetail(p)}
                        className="border text-sm py-1.5 rounded text-gray-600 hover:bg-gray-50">상세 보기 →</button>
                      <button onClick={() => addToQuote(p)}
                        className="bg-blue-600 text-white text-sm py-1.5 rounded">견적에 추가</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 페이징 */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-1 mt-6">
              <PageBtn disabled={page === 0} onClick={() => setPage(page - 1)}>‹</PageBtn>
              {Array.from({ length: totalPages }, (_, i) => i).map(i => (
                <PageBtn key={i} active={i === page} onClick={() => setPage(i)}>{i + 1}</PageBtn>
              ))}
              <PageBtn disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>›</PageBtn>
            </div>
          )}
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

function Chip({ children, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs">
      {children}
      <button onClick={onRemove} className="text-blue-400 hover:text-blue-700">✕</button>
    </span>
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
