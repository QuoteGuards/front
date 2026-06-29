import { useEffect, useId, useRef, useState } from 'react'

// 검색형 셀렉트 — 타이핑으로 옵션 필터. 항목 많은 드롭다운(제품/카테고리)용
// options: [{ value, label }]  | onChange(value)
// 접근성: combobox/listbox/option 시맨틱 + 키보드(↑↓/Enter/Esc) 지원
export default function SearchableSelect({
  value, onChange, options = [], placeholder = '선택', width = '100%', disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const ref = useRef(null)
  const listRef = useRef(null)
  const triggerRef = useRef(null)
  const baseId = useId()
  const listId = `${baseId}-listbox`

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // disabled 전환 시 열린 메뉴 강제 닫기 + 검색어 초기화
  useEffect(() => {
    if (disabled) { setOpen(false); setQuery('') }
  }, [disabled])

  const selected = options.find(o => String(o.value) === String(value ?? ''))
  const q = query.trim().toLowerCase()
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options

  // 검색어/열림 변경 시 활성 항목 초기화
  useEffect(() => { setActiveIndex(0) }, [query, open])

  // 키보드로 이동한 활성 항목을 화면에 보이게 스크롤
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${activeIndex}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const pick = (v) => { if (disabled) return; onChange(v); setOpen(false); setQuery(''); triggerRef.current?.focus() }

  const onInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      // filtered가 비면 length-1이 -1이 되므로 하한을 0으로 고정
      setActiveIndex(i => Math.max(0, Math.min(i + 1, filtered.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const o = filtered[activeIndex]
      if (o) pick(o.value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  const activeOptionId = filtered[activeIndex] ? `${baseId}-opt-${activeIndex}` : undefined

  return (
    <div ref={ref} style={{ position: 'relative', width }}>
      <button ref={triggerRef} type="button" className="form-select" disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true) } }}
        style={{
          width: '100%', textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer',
          background: 'var(--color-bg-white)',
          color: selected ? 'var(--color-text-main)' : 'var(--color-text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
        {selected ? selected.label : placeholder}
      </button>

      {open && !disabled && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--color-bg-white)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
          maxHeight: '260px', overflowY: 'auto',
        }}>
          <div style={{ padding: '8px', position: 'sticky', top: 0, background: 'var(--color-bg-white)', borderBottom: '1px solid var(--color-border)' }}>
            <input autoFocus className="form-input" style={{ height: '34px', fontSize: '13px' }}
              role="combobox" aria-expanded="true" aria-controls={listId}
              aria-autocomplete="list" aria-activedescendant={activeOptionId} aria-label="옵션 검색"
              placeholder="검색" value={query}
              onChange={e => setQuery(e.target.value)} onKeyDown={onInputKeyDown} />
          </div>
          <ul ref={listRef} id={listId} role="listbox" style={{ listStyle: 'none', margin: 0, padding: '4px' }}>
            {filtered.length === 0 ? (
              <li style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>결과 없음</li>
            ) : filtered.map((o, idx) => {
              const isSel = String(o.value) === String(value ?? '')
              const isActive = idx === activeIndex
              return (
                <li key={String(o.value)} id={`${baseId}-opt-${idx}`} data-idx={idx}
                  role="option" aria-selected={isSel}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => pick(o.value)}
                  style={{
                    padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    color: isSel ? 'var(--color-primary)' : 'var(--color-text-main)',
                    fontWeight: isSel ? 600 : 400,
                  }}>
                  {o.label}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
