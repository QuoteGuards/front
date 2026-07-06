import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFavoriteProductsApi, removeFavoriteApi, removeAllFavoritesApi } from '../../api/catalogApi'
import { getActiveCategoryTreeApi } from '../../api/categoryApi'
import PageHeader from '../../components/common/PageHeader'
import SearchPanel, { SearchRow } from '../../components/common/SearchPanel'
import Button from '../../components/common/Button'
import ProductImage from '../../components/common/ProductImage'
import Toast from '../../components/common/Toast'
import { useToast } from '../../hooks/useToast'
import { addPendingQuoteItem } from '../../utils/quoteItemUtils'

const SORTS = [
  { key: 'recent', label: '최근 추가순' },
  { key: 'name', label: '이름순' },
  { key: 'priceAsc', label: '단가 낮은순' },
  { key: 'priceDesc', label: '단가 높은순' },
]

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()

  const [items, setItems] = useState([])      // 즐겨찾기 전체 (활성 제품만)
  const [tree, setTree] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')
  const [tab, setTab] = useState('')          // 최상위 카테고리명, '' = 전체
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { getActiveCategoryTreeApi().then(setTree).catch(() => {}) }, [])

  const load = async () => {
    setLoading(true); setError(null)
    try {
      // 백엔드 기본 sort가 createdAt,desc(최근 추가순)로 정리됨. size는 클라 필터링용 캡(상향)
      const data = await getFavoriteProductsApi({ size: 500, sort: 'createdAt,desc' })
      setItems(data.content ?? [])
    } catch (e) {
      setError(e.response?.data?.message ?? '즐겨찾기 목록 조회 실패')
    } finally {
      setLoading(false)
    }
  }
  // 마운트 시 즐겨찾기 1회 로드 (fetch-in-effect는 의도된 패턴)
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
    setItems([]) // 낙관적
    try {
      await removeAllFavoritesApi() // 벌크: 서버 트랜잭션 1번
    } catch (e) {
      setError(e.response?.data?.message ?? '전체 해제 실패')
      load() // 실패 시 동기화
    }
  }

  const goDetail = (p) => navigate(`/catalog/${p.id}`)
  // 화면 이동 없이 담아두고 알림만 표시 (같은 제품이면 수량 합산)
  const addToQuote = (p) => {
    try {
      const count = addPendingQuoteItem(p, 1)
      showToast(`견적서에 추가되었습니다 (담은 제품 ${count}종)`)
    } catch {
      showToast('견적 담기에 실패했습니다. 다시 시도해주세요.', 'error')
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={['제품', '즐겨찾기']}
        breadcrumbSep=">"
        title="즐겨찾기"
      />

      {/* ── 검색 패널 ── */}
      <SearchPanel>
        <SearchRow label="정렬">
          <select className="form-select" style={{ width: '160px' }} value={sort} onChange={e => setSort(e.target.value)}>
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </SearchRow>
        <SearchRow label="검색">
          <input
            type="text"
            className="form-input"
            style={{ width: '260px' }}
            placeholder="즐겨찾기 내 검색 (제품명/코드)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setSearch(search) }}
          />
          <Button variant="secondary" onClick={() => setSearch(search)}>검색</Button>
        </SearchRow>
      </SearchPanel>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[var(--color-text-sub)]">
          총 <b className="text-[var(--color-text-main)]">{items.length}</b>개
        </span>
        <Button variant="outline" size="sm" onClick={removeAll} disabled={items.length === 0}>전체 해제</Button>
      </div>

      {/* ── 탭 ── */}
      <div className="flex mb-4 text-sm" style={{ borderBottom: '1px solid var(--color-border)', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <TabBtn active={tab === ''} onClick={() => setTab('')}>전체 ({items.length})</TabBtn>
        {tabs.map(t => (
          <TabBtn key={t.name} active={tab === t.name} onClick={() => setTab(t.name)}>{t.name} ({t.count})</TabBtn>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-3 text-sm rounded-[var(--radius-sm)] px-4 py-2.5"
          style={{ color: 'var(--color-danger)', background: '#FEF2F2', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}

      {/* ── 목록 ── */}
      {loading ? (
        <div className="text-center text-[var(--color-text-muted)] py-20">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 rounded-[var(--radius-md)]" style={{ border: '1px solid var(--color-border)' }}>
          <div className="text-[var(--color-text-sub)] mb-1">★ 즐겨찾기한 제품이 없습니다</div>
          <button onClick={() => navigate('/catalog')} className="text-sm mt-2" style={{ color: 'var(--color-primary)' }}>제품 탐색하러 가기 →</button>
        </div>
      ) : view.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-text-muted)] rounded-[var(--radius-md)]" style={{ border: '1px solid var(--color-border)' }}>검색 결과가 없습니다</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {view.map(p => (
            <div key={p.id} className="rounded-[var(--radius-md)] overflow-hidden flex flex-col"
              role="group"
              aria-label={p.name}
              onClick={() => goDetail(p)}
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-white)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              {/* 이미지 + 즐겨찾기 별 */}
              <div className="relative aspect-square flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                <ProductImage src={p.imageUrl} />
                <button onClick={(e) => { e.stopPropagation(); removeOne(p) }}
                  className="absolute top-2 right-2 text-xl"
                  title="즐겨찾기 해제"
                  aria-label="즐겨찾기 해제">
                  <span style={{ color: 'var(--color-warning)' }}>★</span>
                </button>
              </div>
              {/* 본문 */}
              <div className="p-3 flex flex-col flex-1">
                <div className="text-xs text-[var(--color-text-muted)] font-mono">{p.code}</div>
                <div className="font-medium text-sm mt-0.5 line-clamp-2">{p.name}</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{pathOf(p)}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{won(p.unitPrice)}</span>
                  <VatBadge applicable={p.vatApplicable} />
                </div>
                <div className="mt-3 flex flex-col gap-1.5">
                  <Button variant="outline" size="sm" className="w-full"
                    onClick={(e) => { e.stopPropagation(); goDetail(p) }}>상세 보기</Button>
                  <div className="flex gap-1.5">
                    <Button variant="primary" size="sm" className="flex-1"
                      onClick={(e) => { e.stopPropagation(); addToQuote(p) }}>견적에 추가</Button>
                    <Button variant="danger" size="sm" className="flex-1"
                      onClick={(e) => { e.stopPropagation(); removeOne(p) }}>해제</Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
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

function TabBtn({ children, active, onClick }) {
  return (
    <button onClick={onClick}
      className="px-4 py-2.5 whitespace-nowrap -mb-px"
      style={{
        borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
        color: active ? 'var(--color-primary)' : 'var(--color-text-sub)',
        background: 'none', border: 'none', cursor: 'pointer', fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  )
}
