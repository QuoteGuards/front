import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFavoriteProductsApi, removeFavoriteApi } from '../../api/catalogApi'
import { getCategoriesApi } from '../../api/categoryApi'

const SORTS = [
  { key: 'recent', label: '최근 추가순' },
  { key: 'name', label: '이름순' },
  { key: 'priceAsc', label: '단가 낮은순' },
  { key: 'priceDesc', label: '단가 높은순' },
]

export default function FavoritesPage() {
  const navigate = useNavigate()

  const [items, setItems] = useState([])      // 즐겨찾기 전체 (활성 제품만)
  const [tree, setTree] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')
  const [tab, setTab] = useState('')          // 최상위 카테고리명, '' = 전체
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { getCategoriesApi().then(setTree).catch(() => {}) }, [])

  const load = async () => {
    setLoading(true); setError(null)
    try {
      // sort 명시 필수: 미지정 시 백엔드 기본 sort=name이 ProductFavorite 루트에 적용돼 500 발생.
      // createdAt,desc = 즐겨찾기 설정일 최신순(= 최근 추가순)
      const data = await getFavoriteProductsApi({ size: 200, sort: 'createdAt,desc' })
      setItems(data.content ?? [])
    } catch (e) {
      setError(e.response?.data?.message ?? '즐겨찾기 목록 조회 실패')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  // 카테고리 id → 전체경로 / 최상위명 매핑
  const catMaps = useMemo(() => {
    const path = new Map(), top = new Map()
    const walk = (nodes, trail) => {
      for (const n of nodes ?? []) {
        const t = [...trail, n.name]
        path.set(n.id, t.join(' > '))
        top.set(n.id, t[0])
        if (n.children?.length) walk(n.children, t)
      }
    }
    walk(tree, [])
    return { path, top }
  }, [tree])

  const topOf = (p) => catMaps.top.get(p.categoryId) ?? p.categoryName ?? '기타'
  const pathOf = (p) => catMaps.path.get(p.categoryId) ?? p.categoryName ?? ''

  // 탭(최상위 카테고리별 개수)
  const tabs = useMemo(() => {
    const counts = new Map()
    for (const p of items) {
      const t = topOf(p)
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count }))
  }, [items, catMaps]) // eslint-disable-line

  // 검색/탭/정렬 적용
  const view = useMemo(() => {
    let list = items
    if (tab) list = list.filter(p => topOf(p) === tab)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q))
    }
    list = [...list]
    // 'recent'는 서버가 createdAt,desc로 내려준 순서 그대로 유지
    if (sort === 'name') list.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    else if (sort === 'priceAsc') list.sort((a, b) => Number(a.unitPrice) - Number(b.unitPrice))
    else if (sort === 'priceDesc') list.sort((a, b) => Number(b.unitPrice) - Number(a.unitPrice))
    return list
  }, [items, tab, search, sort, catMaps]) // eslint-disable-line

  const removeOne = async (p) => {
    setItems(prev => prev.filter(x => x.id !== p.id)) // 낙관적
    try {
      await removeFavoriteApi(p.id)
    } catch (e) {
      setError(e.response?.data?.message ?? '즐겨찾기 해제 실패')
      load() // 실패 시 동기화
    }
  }

  const removeAll = async () => {
    if (items.length === 0) return
    if (!confirm(`즐겨찾기 ${items.length}개를 전부 해제할까요?`)) return
    const targets = [...items]
    setItems([])
    try {
      await Promise.all(targets.map(p => removeFavoriteApi(p.id)))
    } catch (e) {
      setError(e.response?.data?.message ?? '전체 해제 중 일부 실패')
      load()
    }
  }

  const goDetail = (p) => navigate(`/catalog/${p.id}`)
  const addToQuote = (p) => navigate('/quotes/new', { state: { addProduct: p } })

  return (
    <div className="p-6">
      {/* ── 헤더 ── */}
      <div className="border rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">내 즐겨찾기</h1>
          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <input className="border px-3 py-2 rounded flex-1 min-w-[200px]"
          placeholder="🔍 즐겨찾기 내 검색 (제품명/코드)"
          value={search} onChange={e => setSearch(e.target.value)} />
        <label className="text-sm text-gray-500 flex items-center gap-2">
          정렬:
          <select className="border px-2 py-2 rounded" value={sort} onChange={e => setSort(e.target.value)}>
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <button onClick={removeAll}
          className="border border-red-300 text-red-500 px-3 py-2 rounded text-sm hover:bg-red-50">전체 해제</button>
      </div>

      {/* ── 탭 ── */}
      <div className="flex border-b mb-4 text-sm overflow-x-auto">
        <TabBtn active={tab === ''} onClick={() => setTab('')}>전체 ({items.length})</TabBtn>
        {tabs.map(t => (
          <TabBtn key={t.name} active={tab === t.name} onClick={() => setTab(t.name)}>{t.name} ({t.count})</TabBtn>
        ))}
      </div>

      {error && <div className="mb-3 text-red-500 text-sm">{error}</div>}

      {/* ── 목록 ── */}
      {loading ? (
        <div className="text-center text-gray-400 py-20">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 border rounded-lg">
          <div className="text-gray-500 mb-1">★ 즐겨찾기한 제품이 없습니다</div>
          <button onClick={() => navigate('/catalog')} className="text-blue-600 text-sm mt-2">제품 탐색하러 가기 →</button>
        </div>
      ) : view.length === 0 ? (
        <div className="text-center py-20 text-gray-400 border rounded-lg">검색 결과가 없습니다</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {view.map(p => (
            <div key={p.id} className="border rounded-lg overflow-hidden flex flex-col">
              <div className="relative bg-gray-100 aspect-[16/9] flex items-center justify-center">
                {p.imageUrl
                  ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                  : <span className="text-gray-300 text-sm">이미지</span>}
                <span className="absolute top-2 right-2 text-yellow-400 text-xl">★</span>
              </div>
              <div className="p-3 flex flex-col flex-1">
                <div className="text-xs text-gray-400 font-mono">{p.code}</div>
                <div className="font-medium mt-0.5">{p.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{pathOf(p)}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-blue-600 font-bold">{won(p.unitPrice)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${p.vatApplicable ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                    VAT {p.vatApplicable ? '포함' : '별도'}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => addToQuote(p)} className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded">견적에 추가</button>
                  <button onClick={() => removeOne(p)} className="flex-1 border border-red-300 text-red-500 text-sm py-1.5 rounded hover:bg-red-50">즐겨찾기 해제</button>
                </div>
                <button onClick={() => goDetail(p)} className="border text-sm py-1.5 rounded text-gray-600 hover:bg-gray-50 mt-2">상세 보기 →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function won(v) {
  return v == null || v === '' ? '-' : Number(v).toLocaleString('ko-KR') + '원'
}

function TabBtn({ children, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2.5 whitespace-nowrap border-b-2 -mb-px
        ${active ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
      {children}
    </button>
  )
}
