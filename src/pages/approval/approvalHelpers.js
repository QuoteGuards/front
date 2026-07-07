// 승인 관련 페이지(목록·상세)에서 공용으로 쓰는 라벨/색상/포맷 헬퍼

export const REASON_LABEL = {
  DISCOUNT_EXCEEDED: '할인율 초과',
  LOW_PROFIT: '이익률 미달',
  HIGH_AMOUNT: '고액 견적',
}

export const REASON_BADGE_STYLE = {
  DISCOUNT_EXCEEDED: { background: '#FFF7ED', color: '#C2410C', border: '1px solid #FDBA74' },
  LOW_PROFIT: { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' },
  HIGH_AMOUNT: { background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' },
}

export const ACTION_LABEL = {
  REQUESTED: '승인 요청',
  APPROVED: '승인',
  REJECTED: '반려',
  RE_REQUESTED: '재요청',
}

export const ACTION_DOT_COLOR = {
  REQUESTED: 'bg-[var(--color-primary)]',
  APPROVED: 'bg-[var(--color-success)]',
  REJECTED: 'bg-[var(--color-danger)]',
  RE_REQUESTED: 'bg-[#7C3AED]',
}

export const ACTION_TEXT_COLOR = {
  REQUESTED: 'text-[var(--color-primary)]',
  APPROVED: 'text-[var(--color-success)]',
  REJECTED: 'text-[var(--color-danger)]',
  RE_REQUESTED: 'text-[#7C3AED]',
}

export function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('ko-KR')
}

export function formatDateShort(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('ko-KR')
}

export function elapsedTime(from, to) {
  if (!from || !to) return null
  const diff = Math.abs(new Date(to) - new Date(from))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `약 ${hours}시간 ${minutes}분`
  return `${minutes}분`
}

export function buildGuideSteps(reasons) {
  const steps = []
  let n = 1

  if (reasons.some((r) => r.reasonType === 'DISCOUNT_EXCEEDED')) {
    const msg = reasons.find((r) => r.reasonType === 'DISCOUNT_EXCEEDED')?.message
    steps.push({
      step: n++,
      title: '할인율 조정',
      desc: msg || '카테고리별 최대 할인율 이하로 변경 필요',
      required: true,
    })
  }
  if (reasons.some((r) => r.reasonType === 'LOW_PROFIT')) {
    const msg = reasons.find((r) => r.reasonType === 'LOW_PROFIT')?.message
    steps.push({
      step: n++,
      title: '이익률 확인',
      desc: msg || '제품 구성으로 최소 이익률 이상 확인 필요',
      required: true,
    })
  }
  if (reasons.some((r) => r.reasonType === 'HIGH_AMOUNT')) {
    const msg = reasons.find((r) => r.reasonType === 'HIGH_AMOUNT')?.message
    steps.push({
      step: n++,
      title: '견적 금액 검토',
      desc: msg || '고액 견적 기준을 초과하였습니다. 금액을 검토하세요.',
      required: true,
    })
  }

  steps.push({
    step: n++,
    title: '고객 협의',
    desc: '변경된 조건을 사전 협의하거나 고객의 동의를 확인하세요.',
    required: false,
  })
  steps.push({
    step: n,
    title: '메모 업데이트',
    desc: '변경 사항과 고객 반응을 상담 메모에 기록해두세요.',
    required: false,
  })

  return steps
}

export const TEMP_KEY = (id) => `reRequestMemo_${id}`
