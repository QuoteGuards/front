import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getProductDetailApi, searchProductsApi, addFavoriteApi, removeFavoriteApi,
} from '../../api/catalogApi'
import { getActiveCategoryTreeApi } from '../../api/categoryApi'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import ProductImage from '../../components/common/ProductImage'

export default function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [tree, setTree] = useState([])
  const [qty, setQty] = useState(1)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { getActiveCategoryTreeApi().then(setTree).catch(() => {}) }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setError(null)
    setQty(1) // 제품(productId)이 바뀌면 수량 초기화 — 이전 제품 수량 이월 방지
    getProductDetailApi(productId)
      .then(async (p) => {
        setProduct(p)
        // 같은 카테고리 연관 제품 (자기 자신 제외, 최대 3개)
        try {
          const data = await searchProductsApi({ categoryId: p.categoryId, size: 6 })
          setRelated((data.content ?? []).filter(x => x.id !== p.id).slice(0, 3))
        } catch { setRelated([]) }
      })
      .catch(e => setError(e.response?.data?.message ?? '제품을 불러올 수 없습니다.'))
      .finally(() => setLoading(false))
  }, [productId])

  // 카테고리 id → 전체 경로 맵 (현재 제품 + 연관 제품 공용)
  const catPathMap = useMemo(() => {
    const map = new Map()
    const walk = (nodes, path) => {
      for (const n of nodes ?? []) {
        const p = [...path, n.name]
        map.set(n.id, p.join(' > '))
        if (n.children?.length) walk(n.children, p)
      }
    }
    walk(tree, [])
    return map
  }, [tree])

  const catPath = product ? (catPathMap.get(product.categoryId) ?? product.categoryName ?? '') : ''

  const toggleFavorite = async () => {
    const fav = favoriteOf(product)
    setProduct(p => ({ ...p, isFavorite: !fav, favorite: !fav }))
    try {
      fav ? await removeFavoriteApi(product.id) : await addFavoriteApi(product.id)
    } catch (e) {
      setProduct(p => ({ ...p, isFavorite: fav, favorite: fav }))
      setError(e.response?.data?.message ?? '즐겨찾기 처리 실패')
    }
  }

  const addToQuote = () => navigate('/quotes/new', { state: { addProduct: { ...product, quantity: Number(qty) || 1 } } })

  if (loading) return <div className="p-10 text-center text-[var(--color-text-muted)]">불러오는 중…</div>
  if (error && !product) return (
    <div className="p-10 text-center">
      <div className="text-[var(--color-danger)] mb-4">{error}</div>
      <Button variant="outline" onClick={() => navigate('/catalog')}>← 제품 탐색으로</Button>
    </div>
  )
  if (!product) return null

  const vat = product.vatApplicable
  const supply = vat ? Math.round(Number(product.unitPrice) / 1.1) : Number(product.unitPrice)
  const vatAmount = vat ? Number(product.unitPrice) - supply : 0
  const fav = favoriteOf(product)

  return (
    <div>
      <PageHeader breadcrumbs={['제품', '제품 상세']} />

      {/* 돌아가기 */}
      <div style={{ marginBottom: '16px' }}>
        <Button variant="outline" size="sm" onClick={() => navigate('/catalog')}>← 제품 탐색으로</Button>
      </div>

      {error && (
        <div role="alert" className="mb-3 text-sm rounded-[var(--radius-sm)] px-4 py-2.5"
          style={{ color: 'var(--color-danger)', background: '#FEF2F2', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}

      <div className="flex gap-6">
        {/* ── 좌측: 이미지 + 액션 ── */}
        <div className="w-[420px] shrink-0">
          <div className="rounded-[var(--radius-md)] aspect-square flex items-center justify-center overflow-hidden"
            style={{ background: '#F3F4F6', border: '1px solid var(--color-border)' }}>
            <ProductImage src={product.imageUrl} label="제품 이미지" />
          </div>

          <button className="w-full mt-4" onClick={toggleFavorite}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '9px 16px', borderRadius: 'var(--radius-sm)', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', border: `1px solid ${fav ? '#F59E0B' : 'var(--color-border)'}`,
              background: fav ? '#FFFBEB' : 'transparent',
              color: fav ? '#D97706' : 'var(--color-text-sub)',
            }}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{fav ? '★' : '☆'}</span>
            {fav ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
          </button>

          <Button variant="primary" className="w-full mt-2" onClick={addToQuote}>견적에 추가</Button>

          <div className="flex items-center gap-3 mt-3 text-sm text-[var(--color-text-sub)]">
            <span>견적 추가 시 수량</span>
            <div className="flex items-center rounded-[var(--radius-sm)]" style={{ border: '1px solid var(--color-border)' }}>
              <button onClick={() => setQty(q => Math.max(1, (Number(q) || 1) - 1))} className="px-3 py-1 text-[var(--color-text-sub)]">−</button>
              <input type="number" min="1" className="w-12 text-center py-1" style={{ borderInline: '1px solid var(--color-border)' }} value={qty}
                onChange={e => {
                  const v = e.target.value
                  if (v === '') { setQty(''); return } // 포커스 중 빈값 허용
                  const n = Math.floor(Number(v))
                  if (Number.isFinite(n)) setQty(Math.max(1, n))
                }}
                onBlur={() => { if (qty === '' || Number(qty) < 1) setQty(1) }} />
              <button onClick={() => setQty(q => (Number(q) || 1) + 1)} className="px-3 py-1 text-[var(--color-text-sub)]">+</button>
            </div>
            <span>개</span>
          </div>

        </div>

        {/* ── 우측: 정보 ── */}
        <div className="flex-1">
          <div className="text-xs text-[var(--color-text-muted)]">{catPath}</div>
          <div className="mt-1">
            <h1 className="text-2xl font-bold">{product.name}</h1>
          </div>
          <div className="text-sm text-[var(--color-text-sub)] mt-2">
            제품코드: <span className="font-mono ml-1" style={{ color: 'var(--color-primary)' }}>{product.code}</span>
          </div>

          <hr className="my-5" style={{ borderColor: 'var(--color-border)' }} />

          {/* 단가 */}
          <div className="text-sm text-[var(--color-text-sub)]">판매 단가</div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>{Number(product.unitPrice).toLocaleString('ko-KR')}<span className="text-base text-[var(--color-text-muted)] ml-1">원</span></span>
            <span className={`status-badge status-badge--${vat ? 'green' : 'gray'}`}>VAT {vat ? '포함' : '미적용'}</span>
          </div>
          {vat && (
            <div className="text-xs text-[var(--color-text-muted)] mt-1">
              공급가액: {supply.toLocaleString('ko-KR')}원 | VAT: {vatAmount.toLocaleString('ko-KR')}원
            </div>
          )}

          <hr className="my-5" style={{ borderColor: 'var(--color-border)' }} />

          {/* 설명 */}
          <Section title="제품 설명">
            <div className="rounded-[var(--radius-sm)] p-4 text-sm whitespace-pre-line min-h-[60px]"
              style={{ background: 'var(--color-bg-main)', border: '1px solid var(--color-border)', color: 'var(--color-text-main)' }}>
              {product.description || '등록된 설명이 없습니다.'}
            </div>
          </Section>

          {/* 규격/스펙 */}
          <Section title="규격 / 스펙">
            <table className="w-full text-sm rounded-[var(--radius-sm)] overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <tbody>
                <SpecRow label="규격" value={product.spec || '—'} />
                <SpecRow label="단위" value={product.unit || '—'} />
                <SpecRow label="VAT 적용 여부" value={
                  <span className={`status-badge status-badge--${vat ? 'green' : 'gray'}`}>{vat ? '적용' : '미적용'}</span>
                } />
              </tbody>
            </table>
          </Section>

        </div>
      </div>

      {/* 연관 제품 — 전체 너비 */}
      {related.length > 0 && (
        <div className="mt-8">
          <hr style={{ borderColor: 'var(--color-border)', marginBottom: '24px' }} />
          <h3 className="font-bold mb-4">연관 제품</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            {related.map(r => (
              <Link key={r.id}
                to={`/catalog/${r.id}`}
                className="rounded-[var(--radius-md)] overflow-hidden flex flex-col"
                style={{ width: '180px', flexShrink: 0, border: '1px solid var(--color-border)', background: 'var(--color-bg-white)', textDecoration: 'none', color: 'inherit', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div className="aspect-square flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                  <ProductImage src={r.imageUrl} />
                </div>
                <div className="p-2 flex flex-col gap-0.5">
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{r.code}</div>
                  <div style={{ fontSize: '12px', fontWeight: 500 }} className="line-clamp-2">{r.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }} className="line-clamp-1">{catPathMap.get(r.categoryId) ?? r.categoryName}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
                    {Number(r.unitPrice).toLocaleString('ko-KR')}원
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 헬퍼 ──
function favoriteOf(p) { return p?.isFavorite ?? p?.favorite ?? false }

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h3 className="font-bold mb-2">{title}</h3>
      {children}
    </div>
  )
}
function SpecRow({ label, value }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
      <td className="px-4 py-2.5 w-40" style={{ background: 'var(--color-bg-main)', color: 'var(--color-text-sub)' }}>{label}</td>
      <td className="px-4 py-2.5">{value}</td>
    </tr>
  )
}
