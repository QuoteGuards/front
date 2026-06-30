export const calcQuoteSummary = (items) => {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax
  return { subtotal, tax, total }
}

export const formatKRW = (amount) => amount.toLocaleString('ko-KR') + '원'

const todayLocal = () => {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export { todayLocal }

/** 고객 이메일 발송 가능 여부 (백엔드 validateQuoteSendable 과 동일 기준) */
export const canSendQuoteEmail = (quote) => {
  if (!quote) return false
  if (quote.status === 'EXPIRED') return false
  const sendable = ['APPROVED', 'APPROVAL_NOT_REQUIRED', 'SENT']
  if (!sendable.includes(quote.status)) return false
  const today = todayLocal()
  if (quote.issuedDate && quote.issuedDate > today) return false
  if (quote.validUntil && quote.validUntil < today) return false
  return true
}

export const quoteSendBlockedMessage = (quote) => {
  if (!quote) return '견적 정보를 확인할 수 없습니다.'
  if (quote.status === 'EXPIRED') {
    return '만료된 견적은 발송할 수 없습니다. 만료 견적 재작성 후 승인을 다시 받아주세요.'
  }
  const today = todayLocal()
  if (quote.issuedDate && quote.issuedDate > today) {
    return '견적 발행일 이전에는 발송할 수 없습니다.'
  }
  if (quote.validUntil && quote.validUntil < today) {
    return '견적 유효기간이 만료되어 발송할 수 없습니다. 재작성 및 재승인 후 발송해주세요.'
  }
  return '승인 완료 또는 승인 불필요 상태의 견적만 발송할 수 있습니다.'
}
