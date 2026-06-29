import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCategoriesApi, createCategoryApi, updateCategoryApi,
  activateCategoryApi, deactivateCategoryApi, deleteCategoryApi,
} from '../../api/categoryApi'

const DEPTH_LABEL = { 1: '대분류', 2: '중분류', 3: '소분류' }
const CHILD_LABEL = { 1: '중분류', 2: '소분류' }

export default function CategoryManagePage() {
  const navigate = useNavigate()
  const [tree, setTree] = useState([])
  const [expanded, setExpanded] = useState(new Set())
  const [selected, setSelected] = useState(null)   // 선택 노드
  const [mode, setMode] = useState('empty')        // empty | edit | create
  const [createCtx, setCreateCtx] = useState(null) // { parentId, depth }
  const [form, setForm] = useState({ name: '', slug: '', sortOrder: 0 })
  const [error, setError] = useState(null)

  const load = async () => {
    setError(null)
    try {
      const data = await getCategoriesApi()
      setTree(data)
      return data
    } catch (e) {
      setError(e.response?.data?.message ?? '목록 조회 실패')
      return []
    }
  }
  useEffect(() => { load() }, [])

  // id → node, id → parentId 인덱스
  const index = useMemo(() => {
    const byId = new Map()
    const parentOf = new Map()
    const walk = (nodes, parentId) => {
      for (const n of nodes ?? []) {
        byId.set(n.id, n)
        parentOf.set(n.id, parentId)
        if (n.children?.length) walk(n.children, n.id)
      }
    }
    walk(tree, null)
    return { byId, parentOf }
  }, [tree])

  const pathOf = (node) => {
    if (!node) return ''
    const names = []
    let cur = node
    while (cur) {
      names.unshift(cur.name)
      cur = index.byId.get(index.parentOf.get(cur.id))
    }
    return names.join(' > ')
  }

  const toggle = (id) => {
    const next = new Set(expanded)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpanded(next)
  }

  const selectNode = (node) => {
    setSelected(node)
    setMode('edit')
    setForm({ name: node.name, slug: node.slug, sortOrder: node.sortOrder })
    setError(null)
  }

  const startCreate = (parentId, depth) => {
    setSelected(null)
    setMode('create')
    setCreateCtx({ parentId, depth })
    setForm({ name: '', slug: '', sortOrder: 0 })
    setError(null)
  }

  const onSave = async () => {
    setError(null)
    try {
      if (mode === 'create') {
        await createCategoryApi({
          parentId: createCtx.parentId,
          name: form.name,
          slug: form.slug,
          sortOrder: Number(form.sortOrder) || 0,
        })
      } else {
        await updateCategoryApi(selected.id, {
          name: form.name,
          slug: form.slug,
          sortOrder: Number(form.sortOrder) || 0,
        })
      }
      setMode('empty'); setSelected(null)
      await load()
    } catch (e) {
      setError(e.response?.data?.message ?? '저장 실패 (코드 중복/형식 확인)')
    }
  }

  const onToggleActive = async () => {
    if (!selected) return
    setError(null)
    try {
      if (isActiveOf(selected)) await deactivateCategoryApi(selected.id)
      else await activateCategoryApi(selected.id)
      const data = await load()
      const fresh = findInTree(data, selected.id)
      if (fresh) {
        setSelected(fresh)
        setForm({ name: fresh.name, slug: fresh.slug, sortOrder: fresh.sortOrder })
      }
    } catch (e) {
      setError(e.response?.data?.message ?? '상태 변경 실패')
    }
  }

  const onDelete = async () => {
    if (!selected) return
    if (!confirm(`'${selected.name}' 삭제할까요?`)) return
    try {
      await deleteCategoryApi(selected.id)
      setMode('empty'); setSelected(null)
      await load()
    } catch (e) {
      setError(e.response?.data?.message ?? '삭제 실패 (연결 제품/하위 카테고리 확인)')
    }
  }

  const renderNode = (node) => {
    const isOpen = expanded.has(node.id)
    const isSel = selected?.id === node.id
    const canHaveChild = node.depth < 3
    return (
      <div key={node.id}>
        <div
          onClick={() => selectNode(node)}
          className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded
            ${isSel ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50'}`}
          style={{ paddingLeft: (node.depth - 1) * 16 + 12 }}
        >
          <span className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); toggle(node.id) }} className="w-4 text-gray-400">
              {(node.children?.length || canHaveChild) ? (isOpen ? '▼' : '▶') : ''}
            </button>
            <span>{node.name}</span>
            {isSel && <span className="text-xs">[선택됨]</span>}
          </span>
          <span className="text-xs text-gray-400">
            ({subtreeCount(node)} 제품)
          </span>
        </div>

        {isOpen && (
          <div>
            {node.children?.map(renderNode)}
            {canHaveChild && (
              <div style={{ paddingLeft: node.depth * 16 + 12 }} className="my-1">
                <button onClick={() => startCreate(node.id, node.depth + 1)}
                  className="text-xs text-gray-400 border border-dashed rounded px-2 py-1">
                  + {CHILD_LABEL[node.depth]} 추가
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const detailDepth = mode === 'create' ? createCtx?.depth : selected?.depth
  const detailParentPath = mode === 'create'
    ? (createCtx?.parentId ? pathOf(index.byId.get(createCtx.parentId)) : '(최상위 / 대분류)')
    : (selected ? (pathOf(index.byId.get(index.parentOf.get(selected.id))) || '(최상위 / 대분류)') : '')

  return (
    <div className="flex gap-4 p-6">
      {/* ── 좌측: 카테고리 목록 ── */}
      <div className="w-96 border rounded-lg p-3 self-start">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">카테고리 목록</h2>
          <button onClick={() => startCreate(null, 1)}
            className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded">+ 대분류 추가</button>
        </div>
        {tree.map(renderNode)}
        {tree.length === 0 && <div className="text-gray-400 text-sm py-6 text-center">카테고리 없음</div>}
      </div>

      {/* ── 우측: 상세 정보 ── */}
      <div className="flex-1 border rounded-lg p-6">
        {mode === 'empty' ? (
          <div className="text-gray-400 text-center py-20">카테고리를 선택하거나 추가하세요</div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">카테고리 {mode === 'create' ? '추가' : '상세 정보'}</h2>
              {mode === 'edit' && (
                <div className="flex gap-2">
                  <button onClick={onToggleActive}
                    className="border border-amber-400 text-amber-600 text-sm px-3 py-1.5 rounded">
                    {isActiveOf(selected) ? '비활성화' : '활성화'}
                  </button>
                  <button onClick={onDelete}
                    className="bg-red-400 text-white text-sm px-3 py-1.5 rounded">삭제</button>
                </div>
              )}
            </div>

            {error && <div className="mb-3 text-red-500 text-sm">{error}</div>}

            <div className="space-y-4 max-w-2xl">
              <Row label="상위 카테고리">
                <div className="bg-gray-50 text-gray-500 px-3 py-2 rounded border flex justify-between">
                  <span>{detailParentPath}</span><span className="text-xs text-gray-400">읽기 전용</span>
                </div>
              </Row>
              <Row label="카테고리 유형">
                <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded text-sm">{DEPTH_LABEL[detailDepth]}</span>
              </Row>
              <Row label="카테고리명 *">
                <input className="border px-3 py-2 rounded w-full" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: 세탁기" />
              </Row>
              <Row label="카테고리 코드 *">
                <input className="border px-3 py-2 rounded w-full" value={form.slug}
                  onChange={e => setForm({ ...form, slug: e.target.value })}
                  placeholder="영소문자·숫자·하이픈 (예: elec-home-wm)" />
              </Row>
              <Row label="정렬 순서">
                <input type="number" className="border px-3 py-2 rounded w-32" value={form.sortOrder}
                  onChange={e => setForm({ ...form, sortOrder: e.target.value })} />
              </Row>
              {mode === 'edit' && (
                <Row label="사용 여부">
                  <div className="flex items-center gap-2">
                    <button onClick={onToggleActive}
                      className={`relative w-11 h-6 rounded-full transition ${isActiveOf(selected) ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition
                        ${isActiveOf(selected) ? 'translate-x-5' : ''}`} />
                    </button>
                    <span className="text-sm text-gray-600">{isActiveOf(selected) ? '사용 중' : '미사용'}</span>
                  </div>
                </Row>
              )}
            </div>

            {mode === 'edit' && (
              <div className="mt-6 pt-4 border-t max-w-2xl text-sm flex items-center gap-6">
                <span className="text-gray-600">연결된 제품 수 <b className="ml-1">{subtreeCount(selected)}개</b><span className="text-gray-400 ml-1">(하위 포함)</span></span>
                <button onClick={() => navigate(`/products?categoryId=${selected.id}`)}
                  className="text-blue-600 hover:underline">제품 목록 보기 →</button>
              </div>
            )}

            {mode === 'edit' && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-700 max-w-2xl">
                <div className="font-semibold mb-1">⚠️ 삭제 제한 안내</div>
                연결된 제품이 있거나 하위 카테고리가 있는 경우 삭제할 수 없습니다. 비활성화를 사용하세요.
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6 max-w-2xl">
              <button onClick={() => { setMode('empty'); setSelected(null) }} className="border px-4 py-2 rounded">취소</button>
              <button onClick={onSave} className="bg-blue-600 text-white px-4 py-2 rounded">저장</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// 백엔드가 boolean isActive를 JSON 키 "active"로 직렬화하므로 둘 다 수용
function isActiveOf(n) {
  return n?.isActive ?? n?.active ?? false
}

// 해당 노드 + 모든 하위(자손) 제품 수 합산 (대/중분류는 직접 제품이 0이라 하위 합산이 의미 있음)
function subtreeCount(node) {
  if (!node) return 0
  const own = node.productCount ?? 0
  const children = (node.children ?? []).reduce((sum, c) => sum + subtreeCount(c), 0)
  return own + children
}

function findInTree(nodes, id) {
  for (const n of nodes ?? []) {
    if (n.id === id) return n
    const f = findInTree(n.children, id)
    if (f) return f
  }
  return null
}

function Row({ label, children }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 text-sm text-gray-600 shrink-0">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
