import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_QUOTE, calcQuoteSummary, formatKRW } from '../../constants/mockQuote'
import { downloadQuoteExcel } from '../../utils/excelExport'

const COL_LETTERS = 'ABCDEFG'.split('')

const buildSheet1 = (quote) => [
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

const buildSheet2 = (quote) => {
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

const SHEET_CONFIGS = [
  {
    name: '견적 정보',
    colLetters: ['A', 'B'],
    colWidths: ['w-32', 'w-80'],
    headerRow: 0,
    sectionRows: [7, 15],
    summaryRows: [],
  },
  {
    name: '견적 품목',
    colLetters: COL_LETTERS,
    colWidths: ['w-10', 'w-56', 'w-52', 'w-14', 'w-12', 'w-36', 'w-36'],
    headerRow: 0,
    sectionRows: [],
    summaryRows: [6, 7, 8, 9],
  },
]

const ExcelGrid = ({ rows, config, activeCell, onCellClick }) => {
  const { colLetters, colWidths, headerRow, sectionRows, summaryRows } = config

  return (
    <div className="overflow-auto" style={{ maxHeight: '340px' }}>
      <table className="border-collapse text-xs font-mono select-none">
        <thead>
          <tr>
            <th
              className="sticky top-0 left-0 z-20 bg-[#f3f2f1] border border-gray-300 text-gray-400 text-center"
              style={{ minWidth: '36px', width: '36px' }}
            />
            {colLetters.map((c, ci) => (
              <th
                key={c}
                className="sticky top-0 z-10 bg-[#f3f2f1] border border-gray-300 text-center text-gray-500 font-medium py-0.5 px-1"
                style={{ minWidth: colWidths[ci] ? undefined : '80px' }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const isHeader = ri === headerRow
            const isSection = sectionRows.includes(ri)
            const isSummary = summaryRows.includes(ri)
            const isLastSummary = ri === rows.length - 1 && summaryRows.includes(ri)

            return (
              <tr key={ri}>
                <td className="sticky left-0 z-10 bg-[#f3f2f1] border border-gray-300 text-center text-gray-400 font-medium px-1 py-0.5">
                  {ri + 1}
                </td>
                {colLetters.map((_, ci) => {
                  const cellKey = `${ri}-${ci}`
                  const isActive = activeCell === cellKey
                  const val = row[ci] ?? ''
                  const isEmpty = val === '' || val === null || val === undefined

                  let cellCls =
                    'border border-gray-200 px-2 py-[3px] cursor-pointer transition-colors whitespace-nowrap overflow-hidden text-ellipsis'

                  if (isActive) {
                    cellCls += ' outline outline-2 outline-[#1565c0] outline-offset-[-2px] bg-blue-50'
                  } else if (isHeader) {
                    cellCls += ' bg-[#e2efda] font-semibold text-gray-700'
                  } else if (isSection) {
                    cellCls += ' bg-[#fff2cc] font-semibold text-gray-700'
                  } else if (isLastSummary) {
                    cellCls += ' bg-[#e2efda] font-bold text-gray-800'
                  } else if (isSummary && ci >= colLetters.length - 2) {
                    cellCls += ' bg-[#f3f2f1] text-gray-700'
                  } else {
                    cellCls += ' bg-white text-gray-700 hover:bg-blue-50'
                  }

                  return (
                    <td
                      key={ci}
                      className={cellCls}
                      style={{ maxWidth: colWidths[ci] ? undefined : '200px' }}
                      onClick={() => onCellClick(cellKey, val)}
                    >
                      {isEmpty ? ' ' : String(val)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const ExcelDownloadPage = () => {
  const navigate = useNavigate()
  const quote = MOCK_QUOTE
  const [downloading, setDownloading] = useState(false)
  const [done, setDone] = useState(false)
  const [activeSheet, setActiveSheet] = useState(0)
  const [activeCell, setActiveCell] = useState('0-0')
  const [formulaVal, setFormulaVal] = useState('항목')

  const sheets = [buildSheet1(quote), buildSheet2(quote)]
  const currentRows = sheets[activeSheet]
  const currentConfig = SHEET_CONFIGS[activeSheet]

  const cellAddress = (() => {
    const [ri, ci] = activeCell.split('-').map(Number)
    return `${currentConfig.colLetters[ci] ?? 'A'}${ri + 1}`
  })()

  const handleCellClick = (key, val) => {
    setActiveCell(key)
    setFormulaVal(val === '' ? '' : String(val))
  }

  const handleSheetChange = (idx) => {
    setActiveSheet(idx)
    setActiveCell('0-0')
    setFormulaVal(sheets[idx][0]?.[0] ?? '')
  }

  const handleDownload = async () => {
    setDownloading(true)
    await new Promise((r) => setTimeout(r, 300))
    downloadQuoteExcel(quote)
    setDownloading(false)
    setDone(true)
    setTimeout(() => setDone(false), 3000)
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Page header */}
      <div className="px-8 pt-8 pb-5 border-b border-gray-200 bg-white">
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1 transition-colors"
        >
          ← 돌아가기
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">엑셀 다운로드</h1>
            <p className="text-sm text-gray-400 mt-1">
              견적번호&nbsp;
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                {quote.id}
              </span>
              &nbsp;· 파일명:&nbsp;
              <span className="text-gray-500">
                견적서_{quote.id}_{quote.createdAt}.xlsx
              </span>
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {downloading ? '생성 중...' : done ? '✓ 다운로드 완료' : '⬇ 엑셀 다운로드'}
          </button>
        </div>
      </div>

      {/* Excel viewer */}
      <div className="px-8 py-6">
        <div
          className="rounded-lg overflow-hidden shadow-lg border border-gray-300"
          style={{ fontFamily: 'Calibri, "맑은 고딕", sans-serif' }}
        >
          {/* Title bar */}
          <div className="bg-[#217346] px-4 py-2 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="text-white text-xs font-medium ml-1 opacity-90">
              견적서_{quote.id}_{quote.createdAt}.xlsx — 미리보기
            </span>
          </div>

          {/* Ribbon (simplified) */}
          <div className="bg-[#f3f2f1] border-b border-gray-300 px-3 py-1 flex items-center gap-1 text-xs text-gray-500">
            <span className="px-2 py-0.5 hover:bg-gray-200 rounded cursor-default">홈</span>
            <span className="px-2 py-0.5 hover:bg-gray-200 rounded cursor-default">삽입</span>
            <span className="px-2 py-0.5 hover:bg-gray-200 rounded cursor-default">페이지 레이아웃</span>
            <span className="px-2 py-0.5 hover:bg-gray-200 rounded cursor-default">수식</span>
            <span className="px-2 py-0.5 hover:bg-gray-200 rounded cursor-default">데이터</span>
          </div>

          {/* Formula bar */}
          <div className="bg-[#f3f2f1] border-b border-gray-300 px-2 py-1 flex items-center gap-2 text-xs">
            <span className="w-12 text-center border border-gray-300 bg-white px-1.5 py-0.5 rounded text-gray-700 font-mono font-medium shrink-0">
              {cellAddress}
            </span>
            <span className="text-gray-400 font-medium shrink-0">fx</span>
            <div className="flex-1 bg-white border border-gray-300 px-2 py-0.5 text-gray-700 rounded min-h-5.5">
              {formulaVal}
            </div>
          </div>

          {/* Grid */}
          <ExcelGrid
            rows={currentRows}
            config={currentConfig}
            activeCell={activeCell}
            onCellClick={handleCellClick}
          />

          {/* Sheet tabs */}
          <div className="bg-[#f3f2f1] border-t border-gray-300 flex items-center">
            <div className="flex">
              {SHEET_CONFIGS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSheetChange(idx)}
                  className={`px-4 py-1.5 text-xs border-r border-gray-300 transition-colors ${
                    activeSheet === idx
                      ? 'bg-white text-[#217346] font-semibold border-t-2 border-t-[#217346] -mt-px'
                      : 'text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-auto pr-3">
              {currentRows.length}행 × {currentConfig.colLetters.length}열
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#e2efda] border border-gray-300 inline-block" />
            헤더 / 합계
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#fff2cc] border border-gray-300 inline-block" />
            섹션 구분
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white border border-gray-300 inline-block" />
            데이터 셀
          </span>
        </div>
      </div>
    </div>
  )
}

export default ExcelDownloadPage
