import './SegmentedControl.css'

/**
 * SegmentedControl — 라디오 버튼을 대체하는 필터 컴포넌트
 *
 * @param {'pills'|'toggle'} variant - pills: 다중 옵션 알약형, toggle: 2-4개 박스형 (기본 pills)
 * @param {Array<{value: string, label: string}>} options
 * @param {string} value - 현재 선택된 value
 * @param {function} onChange - (value) => void
 * @param {string} [name] - 접근성용 name (aria-label)
 */
export default function SegmentedControl({ variant = 'pills', options = [], value, onChange, name }) {
  const cls = variant === 'toggle' ? 'seg-toggle' : 'seg-pills'
  const itemCls = variant === 'toggle' ? 'seg-toggle__item' : 'seg-pills__item'
  const activeCls = variant === 'toggle' ? 'seg-toggle__item--active' : 'seg-pills__item--active'

  return (
    <div className={cls} role="group" aria-label={name}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={[itemCls, value === opt.value ? activeCls : ''].filter(Boolean).join(' ')}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
