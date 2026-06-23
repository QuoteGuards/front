import { useState } from 'react'
import Button from '../../components/common/Button'
import {
  requestApproval,
  reRequestApproval,
  getApprovalHistories,
  getApprovalReasons,
} from '../../api/approvalApi'

const REASON_LABEL = {
  DISCOUNT_EXCEEDED: '할인율 초과',
  LOW_PROFIT: '이익률 미달',
  HIGH_AMOUNT: '고액 견적',
}

const ACTION_LABEL = {
  REQUESTED: '요청',
  APPROVED: '승인',
  REJECTED: '반려',
  RE_REQUESTED: '재요청',
  CANCELLED: '취소',
}

const ACTION_COLOR = {
  REQUESTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  RE_REQUESTED: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export default function StaffApprovalPage() {
  const [quoteId, setQuoteId] = useState('')
  const [requestMemo, setRequestMemo] = useState('')

  const [reQuoteId, setReQuoteId] = useState('')
  const [approvalRequestId, setApprovalRequestId] = useState('')
  const [reRequestMemo, setReRequestMemo] = useState('')

  const [historyQuoteId, setHistoryQuoteId] = useState('')
  const [histories, setHistories] = useState([])
  const [reasons, setReasons] = useState([])

  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleRequest = async (e) => {
    e.preventDefault()
    try {
      const res = await requestApproval(quoteId, requestMemo)
      showToast(`✅ 승인 요청 완료 (요청 ID: ${res.data.id})`)
      setQuoteId('')
      setRequestMemo('')
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.message ?? '요청 실패'))
    }
  }

  const handleReRequest = async (e) => {
    e.preventDefault()
    try {
      const res = await reRequestApproval(reQuoteId, approvalRequestId, reRequestMemo)
      showToast(`✅ 재요청 완료 (${res.data.requestCount}회차)`)
      setReQuoteId('')
      setApprovalRequestId('')
      setReRequestMemo('')
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.message ?? '재요청 실패'))
    }
  }

  const handleLoadHistory = async (e) => {
    e.preventDefault()
    try {
      const [hRes, rRes] = await Promise.all([
        getApprovalHistories(historyQuoteId),
        getApprovalReasons(historyQuoteId),
      ])
      setHistories(hRes.data ?? [])
      setReasons(rRes.data ?? [])
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.message ?? '조회 실패'))
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-6">승인 요청</h1>

      {toast && (
        <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* 신규 승인 요청 */}
        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <h2 className="font-semibold text-gray-700 mb-4">신규 승인 요청</h2>
          <form onSubmit={handleRequest} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">견적 ID</label>
              <input
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="견적 ID 입력"
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">요청 메모 (선택)</label>
              <textarea
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="승인 요청 사유를 입력하세요"
                value={requestMemo}
                onChange={(e) => setRequestMemo(e.target.value)}
              />
            </div>
            <Button type="submit">승인 요청</Button>
          </form>
        </div>

        {/* 재요청 */}
        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <h2 className="font-semibold text-gray-700 mb-4">재요청 <span className="text-xs font-normal text-gray-400">(반려 후)</span></h2>
          <form onSubmit={handleReRequest} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">견적 ID</label>
              <input
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="견적 ID 입력"
                value={reQuoteId}
                onChange={(e) => setReQuoteId(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">승인 요청 ID</label>
              <input
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="승인 요청 ID 입력"
                value={approvalRequestId}
                onChange={(e) => setApprovalRequestId(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">재요청 메모 (선택)</label>
              <textarea
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="수정 내용을 입력하세요"
                value={reRequestMemo}
                onChange={(e) => setReRequestMemo(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">재요청</Button>
          </form>
        </div>
      </div>

      {/* 이력 조회 */}
      <div className="border border-gray-200 rounded-xl p-5 bg-white">
        <h2 className="font-semibold text-gray-700 mb-4">승인 이력 / 사유 조회</h2>
        <form onSubmit={handleLoadHistory} className="flex gap-2 mb-4">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="견적 ID 입력"
            value={historyQuoteId}
            onChange={(e) => setHistoryQuoteId(e.target.value)}
            required
          />
          <Button type="submit" variant="secondary">조회</Button>
        </form>

        {reasons.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">승인 필요 사유</p>
            <div className="flex gap-2 flex-wrap">
              {reasons.map((r) => (
                <span key={r.id} className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-full border border-red-200">
                  {REASON_LABEL[r.reasonType] ?? r.reasonType}
                </span>
              ))}
            </div>
          </div>
        )}

        {histories.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left py-2 font-medium">처리</th>
                <th className="text-left py-2 font-medium">담당자</th>
                <th className="text-left py-2 font-medium">일시</th>
                <th className="text-left py-2 font-medium">메모</th>
              </tr>
            </thead>
            <tbody>
              {histories.map((h) => (
                <tr key={h.id} className="border-b border-gray-50">
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLOR[h.action] ?? 'bg-gray-100 text-gray-500'}`}>
                      {ACTION_LABEL[h.action] ?? h.action}
                    </span>
                  </td>
                  <td className="py-2 text-gray-700">{h.actorName}</td>
                  <td className="py-2 text-gray-400 text-xs">{new Date(h.actedAt).toLocaleString()}</td>
                  <td className="py-2 text-gray-400 text-xs">{h.memo ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-300">견적 ID를 입력하고 조회하세요.</p>
        )}
      </div>
    </div>
  )
}
