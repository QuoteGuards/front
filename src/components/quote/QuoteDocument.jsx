import { calcQuoteSummary, formatKRW } from '../../constants/mockQuote'

const QuoteDocument = ({ quote }) => {

  const { subtotal, tax, total } = calcQuoteSummary(quote.items)

  return (
    <div className="print-area bg-white w-full px-12 py-10 font-sans">
      {/* 제목 */}
      <h2 className="text-center text-2xl font-bold tracking-[0.5em] text-gray-800 mb-8">
        견 적 서
      </h2>

      {/* 수신 / 공급자 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
  
        <div className="border border-gray-300 rounded p-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-500 text-xs mb-2">수신</p>
          <p className="font-semibold">{quote.buyer.companyName} 귀하</p>
          <p className="text-gray-500 text-xs mt-1">{quote.buyer.contactName} ({quote.buyer.department})</p>
        </div>
  
        <div className="border border-gray-300 rounded p-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-500 text-xs mb-2">공급자</p>
          <p className="font-semibold">{quote.seller.companyName}</p>
          <p className="text-gray-500 text-xs mt-1">사업자번호: {quote.seller.businessNumber}</p>
          <p className="text-gray-500 text-xs">{quote.seller.address}</p>
        </div>
  
      </div>

      {/* 품목 테이블 */}
      <table className="w-full text-sm border-collapse">
  
        <thead>
          <tr className="bg-gray-50 border-t border-b border-gray-200">
            <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 w-1/3">품명</th>
            <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500">규격</th>
            <th className="py-2.5 px-3 text-center text-xs font-semibold text-gray-500 w-14">수량</th>
            <th className="py-2.5 px-3 text-right text-xs font-semibold text-gray-500 w-28">단가</th>
            <th className="py-2.5 px-3 text-right text-xs font-semibold text-gray-500 w-28">금액</th>
          </tr>
        </thead>
  
        <tbody className="divide-y divide-gray-100">
          {quote.items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="py-3 px-3 text-gray-800 font-medium">{item.name}</td>
              <td className="py-3 px-3 text-gray-500 text-xs">{item.spec}</td>
              <td className="py-3 px-3 text-center text-gray-700">{item.qty}</td>
              <td className="py-3 px-3 text-right text-gray-700">
                ₩ {formatKRW(item.unitPrice)}
              </td>
              <td className="py-3 px-3 text-right text-gray-800 font-medium">
                ₩ {formatKRW(item.unitPrice * item.qty)}
              </td>
            </tr>
          ))}
        </tbody>
  
        <tfoot>
          <tr className="border-t-2 border-gray-300">
            <td colSpan={4} className="py-3 px-3 text-sm font-bold text-gray-700">
              합계 금액 (VAT 포함)
            </td>
            <td className="py-3 px-3 text-right font-bold text-gray-900 text-base">
              {formatKRW(total)}
            </td>
          </tr>
        </tfoot>
  
      </table>

      {/* 비고 */}
      {quote.note && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">비고</p>
          <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{quote.note}</p>
        </div>
      )}
    </div>
  )
}

export default QuoteDocument
