import * as XLSX from 'xlsx'
import { calcQuoteSummary } from './quoteUtils'

const sanitizeFilePart = (v = '') => String(v).replace(/[\\/:*?"<>|]/g, '-').trim()

//표 데이터를 .xlsx 파일로 다운로드 (견적 엑셀과 동일한 xlsx 라이브러리 사용)

export const downloadTableExcel = ({ headers, rows, sheetName = 'Sheet1', fileName }) => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map((header) => ({
    wch: Math.min(Math.max(String(header).length + 2, 10), 40),
  }))
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const safeName = sanitizeFilePart(fileName.replace(/\.xlsx$/i, ''))
  XLSX.writeFile(wb, `${safeName}.xlsx`)
}

export const downloadQuoteExcel = (quote) => {
  const { subtotal, tax, total } = calcQuoteSummary(quote.items)

  const infoData = [
    ['항목', '내용'],
    ['견적번호', quote.id],
    ['상태', quote.status],
    ['작성일', quote.createdAt],
    ['유효기간', quote.validUntil],
    ['승인일', quote.approvedAt ?? ''],
    [],
    ['[공급자]', ''],
    ['회사명', quote.seller.companyName],
    ['대표자', quote.seller.representative],
    ['사업자번호', quote.seller.businessNumber],
    ['주소', quote.seller.address],
    ['전화', quote.seller.tel],
    ['이메일', quote.seller.email],
    [],
    ['[수요자]', ''],
    ['회사명', quote.buyer.companyName],
    ['담당자', quote.buyer.contactName],
    ['부서', quote.buyer.department],
    ['전화', quote.buyer.tel],
    ['이메일', quote.buyer.email],
  ]

  const itemHeaders = ['No', '품목명', '규격/사양', '단위', '수량', '단가', '공급가액']
  const itemRows = quote.items.map((item, idx) => [
    idx + 1,
    item.name,
    item.spec,
    item.unit,
    item.qty,
    item.unitPrice,
    item.unitPrice * item.qty,
  ])
  const summaryRows = [
    [],
    ['', '', '', '', '', '공급가액 합계', subtotal],
    ['', '', '', '', '', '부가세 (10%)', tax],
    ['', '', '', '', '', '합계금액', total],
  ]

  const wb = XLSX.utils.book_new()

  const ws1 = XLSX.utils.aoa_to_sheet(infoData)
  ws1['!cols'] = [{ wch: 14 }, { wch: 42 }]
  XLSX.utils.book_append_sheet(wb, ws1, '견적 정보')

  const ws2 = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemRows, ...summaryRows])
  ws2['!cols'] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 28 },
    { wch: 7 },
    { wch: 7 },
    { wch: 16 },
    { wch: 16 },
  ]
  XLSX.utils.book_append_sheet(wb, ws2, '견적 품목')

  const fileName = `견적서_${sanitizeFilePart(quote.id)}_${sanitizeFilePart(quote.createdAt)}.xlsx`
  XLSX.writeFile(wb, fileName)
}
