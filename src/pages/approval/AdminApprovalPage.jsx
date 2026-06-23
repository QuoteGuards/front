import { useEffect, useState } from 'react'
import Button from '../../components/common/Button'
import { useAuth } from '../../hooks/useAuth'
import {
  getPendingList,
  approveQuote,
  rejectQuote,
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

export default function AdminApprovalPage() {
  const { user } = useAuth()
  const [pendingList, setPendingList] = useState([])
  const [selected, setSelected] = useState(null)
  const [histories, setHistories] = useState([])
  const [reasons, setReasons] = useState([])
  const [memo, setMemo] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadList = async () => {
    try {
      const res = await getPendingList()
      setPendingList(res.data ?? [])
    } catch {
      showToast('목록 조회 실패')
    }
  }

  useEffect(() => { loadList() }, [])

  const handleSelect = async (item) => {
    setSelected(item)
    setMemo('')
    setRejectReason('')
    const [hRes, rRes] = await Promise.all([
      getApprovalHistories(item.quoteId),
      getApprovalReasons(item.quoteId),
    ])
    setHistories(hRes.data ?? [])
    setReasons(rRes.data ?? [])
  }

  const handleApprove = async () => {
    try {
      await approveQuote(selected.quoteId, selected.id, memo)
      showToast('✅ 승인 완료')
      setSelected(null)
      loadList()
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.message ?? '승인 실패'))
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { showToast('반려 사유를 입력하세요'); return }
    try {
      await rejectQuote(selected.quoteId, selected.id, rejectReason)
      showToast('✅ 반려 완료')
      setSelected(null)
      loadList()
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.message ?? '반려 실패'))
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">승인 대기 목록</h1>
        {user && <span className="text-sm text-gray-500">{user.email} · {user.role}</span>}
      </div>

      {toast && (
        <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {toast}
        </div>
      )}

      <div className="flex gap-5">
        {/* 목록 */}
        <div className="w-72 shrink-0 flex flex-col gap-2">
          {pendingList.length === 0 && (
            <p className="text-sm text-gray-400 mt-4">대기 중인 요청이 없습니다.</p>
          )}
          {pendingList.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              className={[
                'p-4 rounded-xl border cursor-pointer transition-colors',
                selected?.id === item.id
                  ? 'border-violet-400 bg-violet-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50',
              ].join(' ')}
            >
              <div className="font-semibold text-gray-800 mb-1">견적 #{item.quoteId}</div>
              <div className="text-sm text-gray-500">요청자: {item.requesterName}</div>
              <div className="text-sm text-gray-500">{item.requestCount}회차 · {new Date(item.requestedAt).toLocaleDateString()}</div>
              {item.requestMemo && (
                <div className="mt-2 text-xs text-gray-400 italic">"{item.requestMemo}"</div>
              )}
            </div>
          ))}
        </div>

        {/* 상세 */}
        {selected ? (
          <div className="flex-1 border border-gray-200 rounded-xl p-6 bg-white flex flex-col gap-6">
            <h2 className="text-lg font-bold text-gray-700">견적 #{selected.quoteId} 검토</h2>

            {/* 승인 필요 사유 */}
            {reasons.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">승인 필요 사유</p>
                <div className="flex gap-2 flex-wrap">
                  {reasons.map((r) => (
                    <span key={r.id} className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-full border border-red-200">
                      {REASON_LABEL[r.reasonType] ?? r.reasonType}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 승인 */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-gray-600">승인 메모 <span className="font-normal text-gray-400">(선택)</span></p>
              <textarea
                className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="승인 메모를 입력하세요"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
              <Button variant="success" onClick={handleApprove}>승인</Button>
            </div>

            {/* 반려 */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-gray-600">반려 사유 <span className="font-normal text-red-400">(필수)</span></p>
              <textarea
                className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-red-300"
                placeholder="반려 사유를 입력하세요"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <Button variant="danger" onClick={handleReject}>반려</Button>
            </div>

            {/* 승인 이력 */}
            {histories.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">승인 이력</p>
                <div className="flex flex-col gap-2">
                  {histories.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 text-sm py-2 border-b border-gray-100">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLOR[h.action] ?? 'bg-gray-100 text-gray-500'}`}>
                        {ACTION_LABEL[h.action] ?? h.action}
                      </span>
                      <span className="text-gray-700">{h.actorName}</span>
                      <span className="text-gray-400 text-xs">{new Date(h.actedAt).toLocaleString()}</span>
                      {h.memo && <span className="text-gray-400 text-xs">"{h.memo}"</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-300 text-sm border border-dashed border-gray-200 rounded-xl">
            왼쪽에서 요청을 선택하세요
          </div>
        )}
      </div>
    </div>
  )
}
