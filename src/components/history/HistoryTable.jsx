const StatusBadge = ({ status }) => {
  const isSuccess = status === '성공'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
      }`}
    >
      {isSuccess ? '✓' : '✗'} {status}
    </span>
  )
}

const HistoryTable = ({ rows }) => (
  <div className="px-8 pb-10">
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['발송일시', '견적번호', '구매처', '수신자', '제목', 'PDF첨부', '상태'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                발송 이력이 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((h) => (
              <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{h.sentAt}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                    {h.quoteId}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 text-sm whitespace-nowrap">{h.buyer}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{h.to}</td>
                <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">{h.subject}</td>
                <td className="px-4 py-3 text-center">
                  {h.attachPdf ? (
                    <span className="text-blue-500 text-xs font-medium">첨부</span>
                  ) : (
                    <span className="text-gray-300 text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={h.status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
)

export default HistoryTable
