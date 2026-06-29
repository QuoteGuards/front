import { useEffect, useRef, useState } from 'react'

// 검색형 셀렉트 — 타이핑으로 옵션 필터. 항목 많은 드롭다운(제품/카테고리)용
// options: [{ value, label }]  | onChange(value)
export default function SearchableSelect({
  value, onChange, options = [], placeholder = '선택', width = '100%', disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const selected = options.find(o => String(o.value) === String(value ?? ''))
  const q = query.trim().toLowerCase()
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options

  const pick = (v) => { onChange(v); setOpen(false); setQuery('') }

  return (
    <div ref={ref} style={{ position: 'relative', width }}>
      <button type="button" className="form-select" disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer',
          background: 'var(--color-bg-white)',
          color: selected ? 'var(--color-text-main)' : 'var(--color-text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
        {selected ? selected.label : placeholder}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--color-bg-white)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
          maxHeight: '260px', overflowY: 'auto',
        }}>
          <div style={{ padding: '8px', position: 'sticky', top: 0, background: 'var(--color-bg-white)', borderBottom: '1px solid var(--color-border)' }}>
            <input autoFocus className="form-input" style={{ height: '34px', fontSize: '13px' }}
              placeholder="검색" value={query} onChange={e => setQuery(e.target.value)} aria-label="옵션 검색" />
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: '4px' }}>
            {filtered.length === 0 ? (
              <li style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>결과 없음</li>
            ) : filtered.map(o => {
              const isSel = String(o.value) === String(value ?? '')
              return (
                <li key={String(o.value)}>
                  <button type="button" onClick={() => pick(o.value)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px',
                      border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      background: isSel ? '#EFF6FF' : 'transparent',
                      color: isSel ? 'var(--color-primary)' : 'var(--color-text-main)',
                      fontWeight: isSel ? 600 : 400,
                    }}>
                    {o.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
