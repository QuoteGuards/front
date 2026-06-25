import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getProductDetailApi, searchProductsApi, addFavoriteApi, removeFavoriteApi,
} from '../../api/catalogApi'
import { getCategoriesApi } from '../../api/categoryApi'

export default function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [tree, setTree] = useState([])
  const [qty, setQty] = useState(1)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { getCategoriesApi().then(setTree).catch(() => {}) }, [])

  useEffect(() => {
    setLoading(true); setError(null)
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

  // 카테고리 전체 경로 (전자제품 > 가전제품 > 세탁기)
  const catPath = useMemo(() => {
    if (!product) return ''
    const map = new Map()
    const walk = (nodes, path) => {
      for (const n of nodes ?? []) {
        const p = [...path, n.name]
        map.set(n.id, p.join(' > '))
        if (n.children?.length) walk(n.children, p)
      }
    }
    walk(tree, [])
    return map.get(product.categoryId) ?? product.categoryName ?? ''
  }, [tree, product])

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

  const addToQuote = () => navigate('/quotes/new', { state: { addProduct: { ...product, quantity: qty } } })

  if (loading) return <div className="p-10 text-center text-gray-400">불러오는 중…</div>
  if (error && !product) return (
    <div className="p-10 text-center">
      <div className="text-red-500 mb-4">{error}</div>
      <button onClick={() => navigate('/catalog')} className="border px-4 py-2 rounded">← 제품 탐색으로</button>
    </div>
  )
  if (!product) return null

  const vat = product.vatApplicable
  const supply = vat ? Math.round(Number(product.unitPrice) / 1.1) : Number(product.unitPrice)
  const vatAmount = vat ? Number(product.unitPrice) - supply : 0

  return (
    <div className="p-6">
      {/* 돌아가기 */}
      <button onClick={() => navigate('/catalog')} className="text-sm text-gray-500 hover:text-gray-800 mb-4">
        ← 제품 탐색으로 돌아가기
      </button>

      {error && <div className="mb-3 text-red-500 text-sm">{error}</div>}

      <div className="flex gap-6">
        {/* ── 좌측: 이미지 + 액션 ── */}
        <div className="w-[420px] shrink-0">
          <div className="border rounded-lg bg-gray-100 aspect-square flex items-center justify-center overflow-hidden">
            {product.imageUrl
              ? <img src={product.imageUrl} alt="" className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.display = 'none' }} />
              : <span className="text-gray-300">제품 이미지</span>}
          </div>

          <button onClick={toggleFavorite}
            className={`w-full mt-4 py-3 rounded border text-sm font-medium
              ${favoriteOf(product) ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            ★ {favoriteOf(product) ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
          </button>

          <button onClick={addToQuote}
            className="w-full mt-2 py-3 rounded bg-blue-600 text-white font-medium">견적에 추가</button>

          <div className="flex items-center gap-3 mt-3 text-sm text-gray-600">
            <span>견적 추가 시 수량</span>
            <div className="flex items-center border rounded">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-1 text-gray-500">−</button>
              <input className="w-12 text-center border-x py-1" value={qty}
                onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))} />
              <button onClick={() => setQty(q => q + 1)} className="px-3 py-1 text-gray-500">+</button>
            </div>
            <span>개</span>
          </div>
        </div>

        {/* ── 우측: 정보 ── */}
        <div className="flex-1">
          <div className="text-xs text-gray-400">{catPath}</div>
          <div className="flex items-start justify-between mt-1">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <button onClick={toggleFavorite}
              className={`text-sm px-3 py-1.5 rounded border shrink-0
                ${favoriteOf(product) ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'border-gray-300 text-gray-500'}`}>
              ★ 즐겨찾기
            </button>
          </div>
          <div className="text-sm text-gray-500 mt-2">
            제품코드: <span className="text-blue-600 font-mono ml-1">{product.code}</span>
          </div>

          <hr className="my-5" />

          {/* 단가 */}
          <div className="text-sm text-gray-500">판매 단가</div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-3xl font-bold text-blue-600">{Number(product.unitPrice).toLocaleString('ko-KR')}<span className="text-base text-gray-400 ml-1">원</span></span>
            <span className={`text-xs px-2 py-1 rounded-full border ${vat ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
              VAT {vat ? '포함' : '미적용'}
            </span>
          </div>
          {vat && (
            <div className="text-xs text-gray-400 mt-1">
              공급가액: {supply.toLocaleString('ko-KR')}원 | VAT: {vatAmount.toLocaleString('ko-KR')}원
            </div>
          )}

          <hr className="my-5" />

          {/* 설명 */}
          <Section title="제품 설명">
            <div className="bg-gray-50 border rounded p-4 text-sm text-gray-700 whitespace-pre-line min-h-[60px]">
              {product.description || '등록된 설명이 없습니다.'}
            </div>
          </Section>

          {/* 규격/스펙 */}
          <Section title="규격 / 스펙">
            <table className="w-full text-sm border rounded overflow-hidden">
              <tbody>
                <SpecRow label="규격" value={product.spec || '—'} />
                <SpecRow label="단위" value={product.unit || '—'} />
                <SpecRow label="VAT 적용 여부" value={
                  <span className={`text-xs px-2 py-0.5 rounded-full ${vat ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {vat ? '적용' : '미적용'}
                  </span>
                } />
              </tbody>
            </table>
          </Section>

          {/* 상태 */}
          <div className="flex items-center gap-2 text-sm mt-5">
            <span className="text-gray-500">상태:</span>
            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${activeOf(product) ? 'bg-green-500' : 'bg-gray-300'}`}>
              {activeOf(product) ? '활성 (구매 가능)' : '비활성'}
            </span>
          </div>

          {/* 연관 제품 */}
          {related.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold mb-2">연관 제품</h3>
              <div className="grid grid-cols-3 gap-3">
                {related.map(r => (
                  <button key={r.id} onClick={() => navigate(`/catalog/${r.id}`)}
                    className="border rounded-lg overflow-hidden text-left hover:shadow">
                    <div className="bg-gray-100 aspect-[4/3] flex items-center justify-center">
                      {r.imageUrl
                        ? <img src={r.imageUrl} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                        : <span className="text-gray-300 text-xs">이미지</span>}
                    </div>
                    <div className="p-2">
                      <div className="text-xs truncate">{r.name}</div>
                      <div className="text-xs text-blue-600 font-semibold">{Number(r.unitPrice).toLocaleString('ko-KR')}원</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 헬퍼 ──
function favoriteOf(p) { return p?.isFavorite ?? p?.favorite ?? false }
function activeOf(p) { return p?.isActive ?? p?.active ?? false }

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
    <tr className="border-b last:border-0">
      <td className="bg-gray-50 px-4 py-2.5 text-gray-500 w-40">{label}</td>
      <td className="px-4 py-2.5">{value}</td>
    </tr>
  )
}
