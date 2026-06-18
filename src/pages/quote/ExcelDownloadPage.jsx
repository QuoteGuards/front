import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_QUOTE, calcQuoteSummary, formatKRW } from '../../constants/mockQuote'
import { downloadQuoteExcel } from '../../utils/excelExport'

const Row = ({ label, value }) => (
  <div className="flex gap-2 text-sm py-1">
    <dt className="text-gray-400 w-24 shrink-0">{label}</dt>
    <dd className="text-gray-700">{value}</dd>
  </div>
)

const ExcelDownloadPage = () => {
  const navigate = useNavigate()
  const quote = MOCK_QUOTE
  const { subtotal, tax, total } = calcQuoteSummary(quote.items)
  const [downloading, setDownloading] = useState(false)
  const [done, setDone] = useState(false)

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
      {/* Header */}
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
              &nbsp;의 데이터를 엑셀 파일로 내보냅니다.
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              done
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {downloading ? '생성 중...' : done ? '✓ 다운로드 완료' : '엑셀 다운로드'}
          </button>
        </div>
      </div>

      {/* Sheet indicator */}
      <div className="px-8 py-4 flex gap-2">
        <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full font-medium">
          Sheet 1 · 견적 정보
        </span>
        <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full font-medium">
          Sheet 2 · 견적 품목
        </span>
      </div>

      <div className="px-8 pb-10 space-y-4">
        {/* Sheet 1: 견적 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              Sheet 1
            </span>
            <h2 className="text-sm font-semibold text-gray-700">견적 기본 정보</h2>
          </div>
          <div className="p-5">
            <dl className="grid grid-cols-2 gap-x-8">
              <div>
                <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">
                  견적 정보
                </p>
                <Row label="견적번호" value={quote.id} />
                <Row label="상태" value={quote.status} />
                <Row label="작성일" value={quote.createdAt} />
                <Row label="유효기간" value={quote.validUntil} />
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">
                    공급자
                  </p>
                  <Row label="회사명" value={quote.seller.companyName} />
                  <Row label="대표자" value={quote.seller.representative} />
                  <Row label="사업자번호" value={quote.seller.businessNumber} />
                  <Row label="이메일" value={quote.seller.email} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">
                    수요자
                  </p>
                  <Row label="회사명" value={quote.buyer.companyName} />
                  <Row label="담당자" value={quote.buyer.contactName} />
                  <Row label="부서" value={quote.buyer.department} />
                  <Row label="이메일" value={quote.buyer.email} />
                </div>
              </div>
            </dl>
          </div>
        </div>

        {/* Sheet 2: 견적 품목 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              Sheet 2
            </span>
            <h2 className="text-sm font-semibold text-gray-700">견적 품목</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['No', '품목명', '규격/사양', '단위', '수량', '단가', '공급가액'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quote.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-2.5 text-gray-800 font-medium">{item.name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{item.spec}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.unit}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.qty}</td>
                    <td className="px-4 py-2.5 text-gray-700">{formatKRW(item.unitPrice)}</td>
                    <td className="px-4 py-2.5 text-gray-800 font-medium">
                      {formatKRW(item.unitPrice * item.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={6} className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">
                    공급가액 합계
                  </td>
                  <td className="px-4 py-2.5 text-gray-800 font-semibold">{formatKRW(subtotal)}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td colSpan={6} className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">
                    부가세 (10%)
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{formatKRW(tax)}</td>
                </tr>
                <tr className="bg-violet-50">
                  <td colSpan={6} className="px-4 py-2.5 text-right text-sm font-bold text-violet-700">
                    합계금액
                  </td>
                  <td className="px-4 py-2.5 text-violet-800 font-bold text-base">
                    {formatKRW(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExcelDownloadPage
