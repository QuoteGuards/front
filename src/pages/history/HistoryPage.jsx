import { useState } from 'react'
import { MOCK_EMAIL_HISTORY, HISTORY_STORAGE_KEY } from '../../constants/mockHistory'

const StatusBadge = ({ status }) => {
  const isSuccess = status === '성공'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isSuccess
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-red-100 text-red-600'
      }`}
    >
      {isSuccess ? '✓' : '✗'} {status}
    </span>
  )
}

const HistoryPage = () => {
  const [history] = useState(() => {
    const stored = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]')
    const merged = [...stored, ...MOCK_EMAIL_HISTORY]
    const seen = new Set()
    return merged.filter((h) => {
      if (seen.has(h.id)) return false
      seen.add(h.id)
      return true
    })
  })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('전체')

  const filtered = history
    .filter((h) => statusFilter === '전체' || h.status === statusFilter)
    .filter(
      (h) =>
        !search ||
        h.to.includes(search) ||
        h.quoteId.includes(search) ||
        h.buyer.includes(search) ||
        h.subject.includes(search)
    )
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))

  const successCount = history.filter((h) => h.status === '성공').length
  const failCount = history.filter((h) => h.status === '실패').length

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="px-8 pt-8 pb-5 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-800">발송 이력</h1>
        <p className="text-sm text-gray-400 mt-1">이메일 발송 내역을 조회합니다.</p>
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
            <span className="text-gray-500">전체</span>
            <span className="font-semibold text-gray-700">{history.length}건</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="text-gray-500">성공</span>
            <span className="font-semibold text-emerald-700">{successCount}건</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            <span className="text-gray-500">실패</span>
            <span className="font-semibold text-red-600">{failCount}건</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 flex gap-3 items-center">
        <input
          type="text"
          placeholder="수신자 / 견적번호 / 회사명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        />
        <div className="flex gap-1">
          {['전체', '성공', '실패'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-violet-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400 ml-auto">{filtered.length}건 표시 중</span>
      </div>

      {/* Table */}
      <div className="px-8 pb-10">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                  발송일시
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                  견적번호
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                  구매처
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                  수신자
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                  제목
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                  PDF첨부
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                    발송 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {h.sentAt}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                        {h.quoteId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-sm whitespace-nowrap">
                      {h.buyer}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{h.to}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">
                      {h.subject}
                    </td>
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
    </div>
  )
}

export default HistoryPage
