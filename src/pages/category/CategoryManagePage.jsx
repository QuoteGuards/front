import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCategoriesApi,
  createCategoryApi,
  updateCategoryApi,
  activateCategoryApi,
  deactivateCategoryApi,
  deleteCategoryApi,
} from '../../api/categoryApi'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'

const DEPTH_LABEL = { 1: '대분류', 2: '중분류', 3: '소분류' }
const CHILD_LABEL = { 1: '중분류', 2: '소분류' }

export default function CategoryManagePage() {
  const navigate = useNavigate()

  const [tree, setTree] = useState([])
  const [expanded, setExpanded] = useState(new Set())
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState('empty') // empty | edit | create
  const [createCtx, setCreateCtx] = useState(null)
  const [form, setForm] = useState({ name: '', slug: '', sortOrder: 0 })
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const data = await getCategoriesApi()
      setTree(data)
      setError(null)
      return data
    } catch (e) {
      setError(e.response?.data?.message ?? '목록 조회 실패')
      return []
    }
  }

  useEffect(() => {
    let ignore = false

    getCategoriesApi()
        .then((data) => {
          if (ignore) return
          setTree(data)
          setError(null)
        })
        .catch((e) => {
          if (ignore) return
          setError(e.response?.data?.message ?? '목록 조회 실패')
        })

    return () => {
      ignore = true
    }
  }, [])

  const index = useMemo(() => {
    const byId = new Map()
    const parentOf = new Map()

    const walk = (nodes, parentId) => {
      for (const node of nodes ?? []) {
        byId.set(node.id, node)
        parentOf.set(node.id, parentId)

        if (node.children?.length) {
          walk(node.children, node.id)
        }
      }
    }

    walk(tree, null)

    return { byId, parentOf }
  }, [tree])

  const pathOf = (node) => {
    if (!node) return ''

    const names = []
    let current = node

    while (current) {
      names.unshift(current.name)
      current = index.byId.get(index.parentOf.get(current.id))
    }

    return names.join(' > ')
  }

  const toggle = (id) => {
    const next = new Set(expanded)

    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }

    setExpanded(next)
  }

  const selectNode = (node) => {
    setSelected(node)
    setMode('edit')
    setCreateCtx(null)
    setForm({
      name: node.name,
      slug: node.slug,
      sortOrder: node.sortOrder,
    })
    setError(null)
  }

  const startCreate = (parentId, depth) => {
    setSelected(null)
    setMode('create')
    setCreateCtx({ parentId, depth })
    setForm({ name: '', slug: '', sortOrder: 0 })
    setError(null)

    if (parentId) {
      setExpanded((prev) => {
        const next = new Set(prev)
        next.add(parentId)
        return next
      })
    }
  }

  const resetDetail = () => {
    setSelected(null)
    setCreateCtx(null)
    setMode('empty')
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

      resetDetail()
      await load()
    } catch (e) {
      setError(e.response?.data?.message ?? '저장 실패 (코드 중복/형식 확인)')
    }
  }

  const onToggleActive = async () => {
    if (!selected) return

    setError(null)

    try {
      if (isActiveOf(selected)) {
        await deactivateCategoryApi(selected.id)
      } else {
        await activateCategoryApi(selected.id)
      }

      const data = await load()
      const fresh = findInTree(data, selected.id)

      if (fresh) {
        setSelected(fresh)
        setForm({
          name: fresh.name,
          slug: fresh.slug,
          sortOrder: fresh.sortOrder,
        })
      }
    } catch (e) {
      setError(e.response?.data?.message ?? '상태 변경 실패')
    }
  }

  const onDelete = async () => {
    if (!selected) return
    if (!confirm(`'${selected.name}' 삭제할까요?`)) return

    setError(null)

    try {
      await deleteCategoryApi(selected.id)
      resetDetail()
      await load()
    } catch (e) {
      setError(e.response?.data?.message ?? '삭제 실패 (연결 제품/하위 카테고리 확인)')
    }
  }

  const renderNode = (node) => {
    const isOpen = expanded.has(node.id)
    const isSelected = selected?.id === node.id
    const canHaveChild = node.depth < 3
    const hasChildren = node.children?.length > 0

    return (
        <div key={node.id}>
          <div
              onClick={() => selectNode(node)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                paddingLeft: (node.depth - 1) * 16 + 12,
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                background: isSelected ? '#EFF6FF' : 'transparent',
                color: isSelected ? 'var(--color-primary)' : 'var(--color-text-main)',
                fontWeight: isSelected ? 600 : 400,
                fontSize: '13px',
              }}
          >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(node.id)
                }}
                style={{
                  width: '16px',
                  color: 'var(--color-text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: hasChildren || canHaveChild ? 'pointer' : 'default',
                  fontSize: '10px',
                  padding: 0,
                }}
            >
              {hasChildren || canHaveChild ? (isOpen ? '▼' : '▶') : ''}
            </button>

            <span>{node.name}</span>
          </span>

            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {subtreeCount(node)}개
          </span>
          </div>

          {isOpen && (
              <div>
                {node.children?.map(renderNode)}

                {canHaveChild && (
                    <div style={{ paddingLeft: node.depth * 16 + 12, margin: '4px 0' }}>
                      <button
                          type="button"
                          onClick={() => startCreate(node.id, node.depth + 1)}
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-text-muted)',
                            border: '1px dashed var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '3px 8px',
                            background: 'transparent',
                            cursor: 'pointer',
                          }}
                      >
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

  const detailParentPath =
      mode === 'create'
          ? createCtx?.parentId
              ? pathOf(index.byId.get(createCtx.parentId))
              : '(최상위 / 대분류)'
          : selected
              ? pathOf(index.byId.get(index.parentOf.get(selected.id))) || '(최상위 / 대분류)'
              : ''

  return (
      <div>
        <PageHeader
            breadcrumbs={['제품', '카테고리 관리']}
            title="카테고리 관리"
            actions={
              <Button variant="primary" onClick={() => startCreate(null, 1)}>
                + 대분류 추가
              </Button>
            }
        />

        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <Card style={{ width: '360px', flexShrink: 0, padding: '16px' }}>
            <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  marginBottom: '12px',
                  color: 'var(--color-text-main)',
                }}
            >
              카테고리 목록
            </h2>

            {/* 카테고리 많아져도 페이지가 길어지지 않게 패널 내부 스크롤 */}
            <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {tree.map(renderNode)}

              {tree.length === 0 && (
                  <div
                      style={{
                        color: error ? 'var(--color-danger)' : 'var(--color-text-muted)',
                        fontSize: '13px',
                        textAlign: 'center',
                        padding: '40px 0',
                      }}
                  >
                    {error ?? '카테고리 없음'}
                  </div>
              )}
            </div>
          </Card>

          <Card style={{ flex: 1 }}>
            {mode === 'empty' ? (
                <div
                    style={{
                      color: 'var(--color-text-muted)',
                      textAlign: 'center',
                      padding: '60px 0',
                      fontSize: '14px',
                    }}
                >
                  카테고리를 선택하거나 추가하세요
                </div>
            ) : (
                <>
                  <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '24px',
                      }}
                  >
                    <h2
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: 'var(--color-text-main)',
                        }}
                    >
                      카테고리 {mode === 'create' ? '추가' : '상세 정보'}
                    </h2>

                    {mode === 'edit' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button variant="ghost" size="sm" onClick={onToggleActive}>
                            {isActiveOf(selected) ? '비활성화' : '활성화'}
                          </Button>
                          <Button variant="danger" size="sm" onClick={onDelete}>
                            삭제
                          </Button>
                        </div>
                    )}
                  </div>

                  {error && (
                      <div
                          role="alert"
                          style={{
                            marginBottom: '16px',
                            fontSize: '13px',
                            color: 'var(--color-danger)',
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: 'var(--radius-sm)',
                            padding: '10px 14px',
                          }}
                      >
                        {error}
                      </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '560px' }}>
                    <Row label="상위 카테고리">
                      <div
                          style={{
                            background: '#F9FAFB',
                            color: 'var(--color-text-sub)',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '14px',
                            width: '100%',
                          }}
                      >
                        <span>{detailParentPath}</span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      읽기 전용
                    </span>
                      </div>
                    </Row>

                    <Row label="카테고리 유형">
                  <span
                      style={{
                        display: 'inline-block',
                        background: '#EFF6FF',
                        color: 'var(--color-primary)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                  >
                    {DEPTH_LABEL[detailDepth]}
                  </span>
                    </Row>

                    <Row label="카테고리명 *">
                      <input
                          style={inputStyle}
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="카테고리명"
                      />
                    </Row>

                    <Row label="카테고리 코드 *">
                      <input
                          style={inputStyle}
                          value={form.slug}
                          onChange={(e) => setForm({ ...form, slug: e.target.value })}
                          placeholder="영소문자·숫자·하이픈"
                      />
                    </Row>

                    <Row label="정렬 순서">
                      <input
                          type="number"
                          style={{ ...inputStyle, width: '120px' }}
                          value={form.sortOrder}
                          onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                      />
                    </Row>

                    {mode === 'edit' && (
                        <>
                          <Row label="사용 여부">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <button
                                  type="button"
                                  onClick={onToggleActive}
                                  style={{
                                    position: 'relative',
                                    width: '44px',
                                    height: '24px',
                                    borderRadius: '12px',
                                    background: isActiveOf(selected) ? 'var(--color-primary)' : '#D1D5DB',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                  }}
                              >
                          <span
                              style={{
                                position: 'absolute',
                                top: '2px',
                                left: isActiveOf(selected) ? '22px' : '2px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: '#FFFFFF',
                                transition: 'left 0.2s',
                              }}
                          />
                              </button>

                              <span style={{ fontSize: '13px', color: 'var(--color-text-sub)' }}>
                          {isActiveOf(selected) ? '사용 중' : '미사용'}
                        </span>
                            </div>
                          </Row>

                          <Row label="연결 제품">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                        <span style={{ color: 'var(--color-text-sub)' }}>
                          하위 포함 <b>{subtreeCount(selected)}개</b>
                        </span>

                              <button
                                  type="button"
                                  onClick={() => navigate(`/products?categoryId=${selected.id}`)}
                                  style={{
                                    color: 'var(--color-primary)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                  }}
                              >
                                제품 목록 보기 →
                              </button>
                            </div>
                          </Row>
                        </>
                    )}

                    <Row label="">
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="outline" size="md" onClick={resetDetail}>
                          취소
                        </Button>
                        <Button variant="primary" size="md" onClick={onSave}>
                          저장
                        </Button>
                      </div>
                    </Row>
                  </div>
                </>
            )}
          </Card>
        </div>
      </div>
  )
}

function Row({ label, children }) {
  return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <label
            style={{
              minWidth: '120px',
              paddingTop: '10px',
              fontSize: '13px',
              color: 'var(--color-text-sub)',
              fontWeight: 500,
            }}
        >
          {label}
        </label>

        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {children}
        </div>
      </div>
  )
}

const inputStyle = {
  width: '100%',
  height: '40px',
  padding: '0 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  color: 'var(--color-text-main)',
  background: '#FFFFFF',
}

function isActiveOf(node) {
  return node?.active === true || node?.status === 'ACTIVE'
}

function subtreeCount(node) {
  if (!node) return 0

  const own = node.productCount ?? 0
  const children = (node.children ?? []).reduce((sum, child) => sum + subtreeCount(child), 0)

  return own + children
}

function findInTree(nodes, id) {
  for (const node of nodes ?? []) {
    if (node.id === id) return node

    const found = findInTree(node.children, id)
    if (found) return found
  }

  return null
}
