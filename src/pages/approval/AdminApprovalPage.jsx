import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPendingList, getApprovalReasons } from '../../api/approvalApi'

const REASON_LABEL = {
  DISCOUNT_EXCEEDED: '할인율 초과',
  LOW_PROFIT: '이익률 미달',
  HIGH_AMOUNT: '고액 견적',
}

const REASON_COLOR = {
  DISCOUNT_EXCEEDED: 'bg-orange-50 text-orange-600 border-orange-200',
  LOW_PROFIT: 'bg-red-50 text-red-600 border-red-200',
  HIGH_AMOUNT: 'bg-purple-50 text-purple-600 border-purple-200',
}

const STATUS_LABEL = { PENDING: '대기', APPROVED: '승인', REJECTED: '반려', CANCELLED: '취소' }
const STATUS_COLOR = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const FILTER_TABS = ['전체', '이익률 미달', '할인율 초과', '고액 견적']
const REASON_KEY = { '이익률 미달': 'LOW_PROFIT', '할인율 초과': 'DISCOUNT_EXCEEDED', '고액 견적': 'HIGH_AMOUNT' }

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border border-gray-100 ${bg}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${color} leading-tight`}>
          {value}
          {typeof value === 'number' && (
            <span className="text-sm font-normal text-gray-500 ml-1">건</span>
          )}
        </p>
      </div>
    </div>
  )
}

export default function AdminApprovalPage() {
  const navigate = useNavigate()
  const [pendingList, setPendingList] = useState([])
  const [reasonsMap, setReasonsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [reasonFilter, setReasonFilter] = useState('전체')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getPendingList()
      const list = res.data ?? []
      setPendingList(list)

      const results = await Promise.all(
        list.map((item) =>
          getApprovalReasons(item.quoteId)
            .then((r) => ({ quoteId: item.quoteId, reasons: r.data ?? [] }))
            .catch(() => ({ quoteId: item.quoteId, reasons: [] }))
        )
      )
      const map = {}
      results.forEach(({ quoteId, reasons }) => { map[quoteId] = reasons })
      setReasonsMap(map)
    } catch {
      // 오류 무시
    } finally {
      setLoading(false)
    }
  }

  const filtered = pendingList
    .filter((item) => {
      if (!search) return true
      return String(item.quoteId).includes(search) || item.requesterName?.includes(search)
    })
    .filter((item) => {
      if (reasonFilter === '전체') return true
      const key = REASON_KEY[reasonFilter]
      return (reasonsMap[item.quoteId] ?? []).some((r) => r.reasonType === key)
    })

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="px-8 pt-8 pb-6 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-800">승인 관리</h1>
        <p className="text-sm text-gray-400 mt-1">검토 대기 중인 견적을 확인하고 승인/반려하세요.</p>

        <div className="grid grid-cols-4 gap-4 mt-5">
          <StatCard icon="⏳" label="승인 대기" value={pendingList.length} color="text-amber-600" bg="bg-amber-50" />
          <StatCard icon="📋" label="오늘 신규" value={pendingList.filter(i => new Date(i.requestedAt).toDateString() === new Date().toDateString()).length} color="text-blue-600" bg="bg-blue-50" />
          <StatCard icon="✅" label="이달 승인" value="—" color="text-emerald-600" bg="bg-emerald-50" />
          <StatCard icon="✗" label="이달 반려" value="—" color="text-red-500" bg="bg-red-50" />
        </div>
      </div>

      {/* 검색 + 탭 필터 */}
      <div className="px-8 py-4 flex gap-3 items-center bg-white border-b border-gray-100">
        <input
          type="text"
          placeholder="견적 ID, 영업사원명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        />
        <div className="flex gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setReasonFilter(tab)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                reasonFilter === tab
                  ? 'bg-violet-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400 ml-auto">{filtered.length}건 표시 중</span>
      </div>

      {/* 테이블 */}
      <div className="px-8 py-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">견적번호</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">영업사원</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">승인 사유</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">요청일</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">요청 횟수</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">상태</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-sm text-gray-400">
                    승인 목록을 불러오는 중...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-sm text-gray-400">
                    대기 중인 승인 요청이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const reasons = reasonsMap[item.quoteId] ?? []
                  return (
                    <tr key={item.id} className="hover:bg-violet-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          #{item.quoteId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{item.requesterName}</td>
                      <td className="px-4 py-3">
                        {reasons.length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <div className="flex gap-1 flex-wrap">
                            {reasons.map((r) => (
                              <span
                                key={r.id}
                                className={`px-2 py-0.5 text-xs rounded-full border ${REASON_COLOR[r.reasonType] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}
                              >
                                {REASON_LABEL[r.reasonType] ?? r.reasonType}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {item.requestedAt ? new Date(item.requestedAt).toLocaleDateString('ko-KR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{item.requestCount}회차</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[item.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_LABEL[item.status] ?? item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/admin/approval/${item.id}`)}
                          className="px-3 py-1.5 text-xs rounded-lg font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                        >
                          검토
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
