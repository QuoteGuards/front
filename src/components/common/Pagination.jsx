/**
 * 공통 페이지네이션 컴포넌트
 * Props:
 *   page        - 현재 페이지 (0-based)
 *   totalPages  - 전체 페이지 수
 *   onChange    - 페이지 변경 핸들러 (newPage) => void
 *   showEdge    - 첫/마지막 페이지 버튼 표시 여부 (기본 true)
 */
export default function Pagination({ page, totalPages, onChange, showEdge = true }) {
  if (totalPages <= 1) return null

  // 현재 페이지 주변 ±2, 첫/마지막 페이지 항상 표시 + 생략 처리
  const pageNums = Array.from({ length: totalPages }, (_, i) => i).filter(
    (i) => Math.abs(i - page) <= 2 || i === 0 || i === totalPages - 1
  )

  const btnBase =
    'inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded text-[13px] border transition-colors disabled:cursor-not-allowed disabled:opacity-50'
  const btnActive = `${btnBase} bg-[var(--color-primary)] text-white border-[var(--color-primary)] font-semibold`
  const btnInactive = `${btnBase} bg-white text-[var(--color-text-sub)] border-[var(--color-border)] hover:bg-gray-50`

  return (
    <nav
      className="flex items-center justify-center gap-1 mt-5"
      aria-label="페이지 탐색"
    >
      {showEdge && (
        <button
          type="button"
          className={btnInactive}
          onClick={() => onChange(0)}
          disabled={page === 0}
          aria-label="첫 페이지"
        >
          {'<<'}
        </button>
      )}
      <button
        type="button"
        className={btnInactive}
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        aria-label="이전 페이지"
      >
        {'<'}
      </button>

      {pageNums.map((p, idx, arr) => (
        <span key={p} className="inline-flex items-center gap-1">
          {idx > 0 && arr[idx - 1] !== p - 1 && (
            <span className="px-1 text-[var(--color-text-muted)]">…</span>
          )}
          <button
            type="button"
            className={p === page ? btnActive : btnInactive}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p + 1}
          </button>
        </span>
      ))}

      <button
        type="button"
        className={btnInactive}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1}
        aria-label="다음 페이지"
      >
        {'>'}
      </button>
      {showEdge && (
        <button
          type="button"
          className={btnInactive}
          onClick={() => onChange(totalPages - 1)}
          disabled={page >= totalPages - 1}
          aria-label="마지막 페이지"
        >
          {'>>'}
        </button>
      )}
    </nav>
  )
}
