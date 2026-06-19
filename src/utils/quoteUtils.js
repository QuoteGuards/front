export const calcQuoteSummary = (items) => {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax
  return { subtotal, tax, total }
}

export const formatKRW = (amount) => amount.toLocaleString('ko-KR') + '원'
