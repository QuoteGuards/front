import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuotes } from '../../hooks/useQuotes'
import { formatKRW } from '../../utils/quoteUtils'

const STATUS_STYLES = {
  '작성중': 'bg-gray-100 text-gray-600',
  '발행':   'bg-blue-100 text-blue-700',
  '승인':   'bg-emerald-100 text-emerald-700',
  '만료':   'bg-red-100 text-red-500',
}

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500'}`}>
    {status}
  </span>
)

const QuoteListPage = () => {
  const navigate = useNavigate()
  const { quotes, loading, error } = useQuotes()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('전체')

  const filtered = quotes
    .filter((q) => statusFilter === '전체' || q.status === statusFilter)
    .filter(
      (q) =>
        !search ||
        q.id.includes(search) ||
        q.buyerName.includes(search) ||
        q.contactName.includes(search)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const statuses = ['전체', ...Object.keys(STATUS_STYLES)]

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="px-8 pt-8 pb-5 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-800">내 견적 목록</h1>
        <p className="text-sm text-gray-400 mt-1">전체 {quotes.length}건의 견적서가 있습니다.</p>
      </div>

      <div className="px-8 py-4 flex gap-3 items-center">
        <input
          type="text"
          placeholder="견적번호 / 거래처명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        />
        <div className="flex gap-1">
          {statuses.map((s) => (
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

      <div className="px-8 pb-10">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 text-center text-sm text-gray-400">견적 목록을 불러오는 중...</div>
          ) : error ? (
            <div className="py-20 text-center text-sm text-red-400">목록을 불러올 수 없습니다.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">견적번호</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">거래처</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">담당자</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">발행일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">유효기한</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">합계금액</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-gray-400">
                      견적서가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filtered.map((q) => (
                    <tr
                      key={q.id}
                      onClick={() => navigate(`/quotes/${q.id}/preview`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/quotes/${q.id}/preview`) }}
                      tabIndex={0}
                      className="hover:bg-violet-50 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-500"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          {q.id}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{q.buyerName}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{q.contactName}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{q.createdAt}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{q.validUntil}</td>
                      <td className="px-4 py-3 text-right text-gray-800 font-medium whitespace-nowrap">
                        {formatKRW(q.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={q.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuoteListPage
