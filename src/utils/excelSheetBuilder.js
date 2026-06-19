import { calcQuoteSummary, formatKRW } from './quoteUtils'

export const buildSheet1 = (quote) => [
  ['항목', '내용'],
  ['견적번호', quote.id],
  ['상태', quote.status],
  ['작성일', quote.createdAt],
  ['유효기간', quote.validUntil],
  ['승인일', quote.approvedAt ?? ''],
  ['', ''],
  ['[공급자]', ''],
  ['회사명', quote.seller.companyName],
  ['대표자', quote.seller.representative],
  ['사업자번호', quote.seller.businessNumber],
  ['주소', quote.seller.address],
  ['전화', quote.seller.tel],
  ['이메일', quote.seller.email],
  ['', ''],
  ['[수요자]', ''],
  ['회사명', quote.buyer.companyName],
  ['담당자', quote.buyer.contactName],
  ['부서', quote.buyer.department],
  ['전화', quote.buyer.tel],
  ['이메일', quote.buyer.email],
]

export const buildSheet2 = (quote) => {
  const { subtotal, tax, total } = calcQuoteSummary(quote.items)
  return [
    ['No', '품목명', '규격/사양', '단위', '수량', '단가', '공급가액'],
    ...quote.items.map((item, idx) => [
      idx + 1,
      item.name,
      item.spec,
      item.unit,
      item.qty,
      formatKRW(item.unitPrice),
      formatKRW(item.unitPrice * item.qty),
    ]),
    ['', '', '', '', '', '', ''],
    ['', '', '', '', '', '공급가액 합계', formatKRW(subtotal)],
    ['', '', '', '', '', '부가세 (10%)', formatKRW(tax)],
    ['', '', '', '', '', '합계금액', formatKRW(total)],
  ]
}

export const buildSheets = (quote) => [buildSheet1(quote), buildSheet2(quote)]
