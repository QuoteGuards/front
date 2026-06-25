import { useState, useEffect } from 'react'
import {
  reRequestApproval,
  updateApprovalMemo,
  getApprovalHistories,
  getApprovalReasons,
  getMyPendingApprovalQuotes,
  getMyRevisingQuotes,
  getMyAllQuotes,
} from '../../api/approvalApi'

const TABS = ['승인 요청', '반려 · 재요청', '승인 이력']

const ACTION_LABEL = {
  REQUESTED: '승인 요청',
  APPROVED: '승인',
  REJECTED: '반려',
  RE_REQUESTED: '재요청',
}

const ACTION_DOT_COLOR = {
  REQUESTED: 'bg-blue-500',
  APPROVED: 'bg-emerald-500',
  REJECTED: 'bg-red-500',
  RE_REQUESTED: 'bg-violet-500',
}

const ACTION_TEXT_COLOR = {
  REQUESTED: 'text-blue-700',
  APPROVED: 'text-emerald-700',
  REJECTED: 'text-red-700',
  RE_REQUESTED: 'text-violet-700',
}

const REASON_LABEL = {
  DISCOUNT_EXCEEDED: '할인율 초과',
  LOW_PROFIT: '이익률 미달',
  HIGH_AMOUNT: '고액 견적',
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('ko-KR')
}

function formatDateShort(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('ko-KR')
}

function elapsedTime(from, to) {
  if (!from || !to) return null
  const diff = Math.abs(new Date(to) - new Date(from))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}시간 ${minutes}분`
  return `${minutes}분`
}

// ── 탭 1: 승인 요청 ───────────────────────────────────────
function RequestTab() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [detailMap, setDetailMap] = useState({})
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)   // 메모 수정 중인 quoteId
  const [editMemo, setEditMemo] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await getMyPendingApprovalQuotes()
      setQuotes(res.data?.data ?? [])
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (q) => {
    if (selectedId === q.id) {
      setSelectedId(null)
      setEditingId(null)
      return
    }
    setSelectedId(q.id)
    setEditingId(null)
    setSaveError('')
    setSaveSuccess('')
    if (!detailMap[q.id]) {
      setDetailLoading(true)
      try {
        const [histRes, reasonRes] = await Promise.all([
          getApprovalHistories(q.id),
          getApprovalReasons(q.id),
        ])
        setDetailMap((prev) => ({
          ...prev,
          [q.id]: { histories: histRes.data ?? [], reasons: reasonRes.data ?? [] },
        }))
      } catch {
        setDetailMap((prev) => ({ ...prev, [q.id]: { histories: [], reasons: [] } }))
      } finally {
        setDetailLoading(false)
      }
    }
  }

  const startEdit = (currentMemo) => {
    setEditMemo(currentMemo ?? '')
    setSaveError('')
    setSaveSuccess('')
    setEditingId(selectedId)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setSaveError('')
  }

  const handleSaveMemo = async (q, approvalRequestId) => {
    setSaveError('')
    setSaveSuccess('')
    setSaveLoading(true)
    try {
      await updateApprovalMemo(q.id, approvalRequestId, editMemo.trim())
      // 로컬 detailMap의 메모 업데이트 (리로드 없이 반영)
      const saved = editMemo.trim()
      setDetailMap((prev) => {
        const prevDetail = prev[q.id]
        const target = [...prevDetail.histories]
          .reverse()
          .find((h) => h.action === 'REQUESTED' || h.action === 'RE_REQUESTED')
        const updatedHistories = prevDetail.histories.map((h) =>
          h.id === target?.id ? { ...h, memo: saved } : h
        )
        return { ...prev, [q.id]: { ...prevDetail, histories: updatedHistories } }
      })
      setSaveSuccess('메모가 수정되었습니다.')
      setEditingId(null)
    } catch (e) {
      setSaveError(e.response?.data?.message ?? '수정 중 오류가 발생했습니다.')
    } finally {
      setSaveLoading(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400 py-10 text-center">목록을 불러오는 중...</p>
  }

  return (
    <div>
      {saveSuccess && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {saveSuccess}
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-gray-400">승인 대기 중인 견적이 없습니다.</p>
          <p className="text-xs text-gray-300 mt-1">
            승인이 필요한 견적은 견적 목록에서 먼저 제출하세요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {quotes.map((q) => {
            const detail = detailMap[q.id]
            const lastRequest = detail?.histories
              ? [...detail.histories].reverse().find(
                  (h) => h.action === 'REQUESTED' || h.action === 'RE_REQUESTED'
                )
              : null
            const requestCount = detail?.histories?.filter(
              (h) => h.action === 'REQUESTED' || h.action === 'RE_REQUESTED'
            ).length ?? 0
            const approvalRequestId = lastRequest?.approvalRequestId
            const isEditing = editingId === q.id

            return (
              <div
                key={q.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div
                  className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleToggle(q)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                      #{q.id}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{q.customerName ?? '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        제출일: {formatDateShort(q.submittedAt ?? q.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                      승인 대기 중
                    </span>
                    <span className="text-xs text-gray-300">{selectedId === q.id ? '↑' : '↓'}</span>
                  </div>
                </div>

                {selectedId === q.id && (
                  <div className="px-5 pb-5 border-t border-gray-100 bg-gray-50">
                    {detailLoading && !detail ? (
                      <p className="text-xs text-gray-400 py-6 text-center">불러오는 중...</p>
                    ) : (
                      <div className="pt-4 flex flex-col gap-3">
                        {/* 요청 정보 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white rounded-lg border border-gray-100 px-4 py-3">
                            <p className="text-xs text-gray-400">요청일시</p>
                            <p className="text-sm font-medium text-gray-800 mt-0.5">
                              {formatDate(lastRequest?.actedAt ?? q.submittedAt)}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-100 px-4 py-3">
                            <p className="text-xs text-gray-400">요청 횟수</p>
                            <p className="text-sm font-medium text-gray-800 mt-0.5">
                              {requestCount > 0 ? `${requestCount}회` : '1회'}
                            </p>
                          </div>
                        </div>

                        {/* 승인 필요 사유 */}
                        {detail?.reasons?.length > 0 && (
                          <div className="bg-white rounded-lg border border-gray-100 px-4 py-3">
                            <p className="text-xs text-gray-400 mb-2">승인 필요 사유</p>
                            <div className="flex flex-wrap gap-1.5">
                              {detail.reasons.map((r) => (
                                <span
                                  key={r.id}
                                  className="px-2.5 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                                >
                                  {REASON_LABEL[r.reasonType] ?? r.reasonType}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 전달한 메모 */}
                        <div className="bg-white rounded-lg border border-gray-100 px-4 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs text-gray-400">전달한 메모</p>
                            {!isEditing && (
                              <button
                                onClick={(e) => { e.stopPropagation(); startEdit(lastRequest?.memo) }}
                                className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                              >
                                메모 수정
                              </button>
                            )}
                          </div>

                          {isEditing ? (
                            <>
                              <textarea
                                value={editMemo}
                                onChange={(e) => setEditMemo(e.target.value)}
                                placeholder="관리자에게 전달할 메모를 입력하세요."
                                rows={3}
                                className="w-full border border-violet-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                              {saveError && (
                                <p className="text-xs text-red-500 mt-1.5">{saveError}</p>
                              )}
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSaveMemo(q, approvalRequestId)
                                  }}
                                  disabled={saveLoading}
                                  className="flex-1 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:bg-gray-200 disabled:text-gray-400"
                                >
                                  {saveLoading ? '저장 중...' : '저장'}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); cancelEdit() }}
                                  disabled={saveLoading}
                                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  취소
                                </button>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[1.5rem]">
                              {lastRequest?.memo || <span className="text-gray-300">작성된 메모가 없습니다.</span>}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 px-1 pt-1">
                          <p className="text-xs text-amber-600">
                            관리자 검토를 기다리고 있습니다. 승인되면 고객에게 견적을 발송할 수 있습니다.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 탭 2: 반려 · 재요청 ──────────────────────────────────
function RejectReRequestTab() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [histories, setHistories] = useState([])
  const [reasons, setReasons] = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [reRequestMemo, setReRequestMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await getMyRevisingQuotes()
      setQuotes(res.data?.data ?? [])
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }

  const selectQuote = async (q) => {
    if (selectedQuote?.id === q.id) { setSelectedQuote(null); return }
    setSelectedQuote(q)
    setReRequestMemo('')
    setError('')
    setSuccess('')
    setHistLoading(true)
    try {
      const [histRes, reasonRes] = await Promise.all([
        getApprovalHistories(q.id),
        getApprovalReasons(q.id),
      ])
      setHistories(histRes.data ?? [])
      setReasons(reasonRes.data ?? [])
    } catch {
      setHistories([])
      setReasons([])
    } finally {
      setHistLoading(false)
    }
  }

  const handleReRequest = async () => {
    if (!selectedQuote) return
    if (!reRequestMemo.trim()) { setError('재요청 사유를 입력해주세요.'); return }
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const rejectedHistory = [...histories].reverse().find((h) => h.action === 'REJECTED')
      const approvalRequestId = rejectedHistory?.approvalRequestId
      if (!approvalRequestId) {
        setError('승인 요청 정보를 찾을 수 없습니다.')
        setSubmitting(false)
        return
      }
      await reRequestApproval(selectedQuote.id, approvalRequestId, reRequestMemo.trim())
      setSuccess('재요청이 완료되었습니다.')
      setSelectedQuote(null)
      load()
    } catch (e) {
      setError(e.response?.data?.message ?? '재요청 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const rejectedEntry = histories.length > 0
    ? [...histories].reverse().find((h) => h.action === 'REJECTED')
    : null

  const requestedEntry = histories.length > 0
    ? histories.find((h) => h.action === 'REQUESTED' || h.action === 'RE_REQUESTED')
    : null

  if (loading) {
    return <p className="text-sm text-gray-400 py-10 text-center">목록을 불러오는 중...</p>
  }

  if (quotes.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-gray-400">반려된 견적이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {success && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="flex gap-5 items-start">
        {/* 좌측: 반려 견적 목록 */}
        <div className="w-56 shrink-0 flex flex-col gap-2">
          {quotes.map((q) => (
            <button
              key={q.id}
              onClick={() => selectQuote(q)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                selectedQuote?.id === q.id
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="font-mono text-xs text-gray-400">#{q.id}</span>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{q.customerName ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatDateShort(q.createdAt)}</p>
            </button>
          ))}
        </div>

        {/* 우측: 상세 */}
        {!selectedQuote ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <p className="text-sm text-gray-400">왼쪽에서 견적을 선택하세요.</p>
          </div>
        ) : histLoading ? (
          <div className="flex-1 py-10 text-center text-sm text-gray-400">
            데이터를 불러오는 중...
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            {/* 반려 배너 */}
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <span className="text-red-500 font-bold text-sm">✗</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700">견적이 반려되었습니다</p>
                <p className="text-xs text-red-400 mt-0.5">
                  아래 내용을 확인하고 수정 후 재요청하세요.
                </p>
              </div>
            </div>

            {/* 반려 상세 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">반려 상세 정보</h3>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">처리자</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">
                    {rejectedEntry?.actorName ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">반려일시</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">
                    {formatDate(rejectedEntry?.actedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">처리 소요 시간</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">
                    {elapsedTime(requestedEntry?.actedAt, rejectedEntry?.actedAt) ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">견적 번호</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                      #{selectedQuote.id}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* 반려 사유 */}
            {rejectedEntry?.memo && (
              <div className="bg-white rounded-xl border border-red-100 shadow-sm">
                <div className="px-5 py-4 border-b border-red-50">
                  <h3 className="text-sm font-semibold text-red-600">반려 사유</h3>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {rejectedEntry.memo}
                  </p>
                </div>
              </div>
            )}

            {/* 리스크 항목 */}
            {reasons.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">리스크 항목</h3>
                </div>
                <div className="px-5 py-4 flex flex-wrap gap-2">
                  {reasons.map((r) => (
                    <span
                      key={r.id}
                      className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600"
                    >
                      {REASON_LABEL[r.reasonType] ?? r.reasonType}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 수정 가이드 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">수정 가이드</h3>
              </div>
              <div className="px-5 py-4">
                <div className="flex flex-col gap-3">
                  {[
                    { step: 1, title: '반려 사유 확인', desc: '위의 반려 사유를 정확히 파악하세요.' },
                    {
                      step: 2,
                      title: '견적 수정',
                      desc: '견적 목록에서 해당 견적을 열어 문제 항목을 수정하세요.',
                    },
                    {
                      step: 3,
                      title: '재요청 사유 작성',
                      desc: '수정 내용과 개선 근거를 아래에 작성하세요.',
                    },
                    {
                      step: 4,
                      title: '재요청 제출',
                      desc: '재요청 버튼을 눌러 관리자에게 다시 검토 요청하세요.',
                    },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {step}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 재요청 사유 입력 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">재요청 사유</h3>
              </div>
              <div className="px-5 py-4">
                <textarea
                  value={reRequestMemo}
                  onChange={(e) => setReRequestMemo(e.target.value)}
                  placeholder="수정한 내용과 재요청 사유를 입력하세요."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                <button
                  onClick={handleReRequest}
                  disabled={submitting}
                  className="mt-3 w-full py-2.5 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? '처리 중...' : '재요청하기'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 탭 3: 승인 이력 ──────────────────────────────────────
function HistoryTab() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [histories, setHistories] = useState([])
  const [histLoading, setHistLoading] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await getMyAllQuotes()
      const all = res.data?.data ?? []
      setQuotes(
        all.filter((q) =>
          ['APPROVAL_PENDING', 'REVISING', 'APPROVED', 'SENT'].includes(q.status)
        )
      )
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }

  const selectQuote = async (q) => {
    if (selectedQuote?.id === q.id) { setSelectedQuote(null); return }
    setSelectedQuote(q)
    setHistLoading(true)
    try {
      const res = await getApprovalHistories(q.id)
      setHistories(res.data ?? [])
    } catch {
      setHistories([])
    } finally {
      setHistLoading(false)
    }
  }

  const lastHistory = histories.length > 0 ? histories[histories.length - 1] : null

  if (loading) {
    return <p className="text-sm text-gray-400 py-10 text-center">목록을 불러오는 중...</p>
  }

  return (
    <div className="flex gap-5 items-start">
      {/* 좌측: 견적 목록 */}
      <div className="w-56 shrink-0 flex flex-col gap-2">
        {quotes.length === 0 ? (
          <p className="text-sm text-gray-400 py-5 text-center">조회할 이력이 없습니다.</p>
        ) : (
          quotes.map((q) => (
            <button
              key={q.id}
              onClick={() => selectQuote(q)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                selectedQuote?.id === q.id
                  ? 'border-violet-400 bg-violet-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-gray-400">#{q.id}</span>
                <span
                  className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                    q.status === 'APPROVED' || q.status === 'SENT'
                      ? 'bg-emerald-100 text-emerald-700'
                      : q.status === 'REVISING'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {q.status === 'APPROVAL_PENDING'
                    ? '대기'
                    : q.status === 'REVISING'
                    ? '반려'
                    : q.status === 'APPROVED'
                    ? '승인'
                    : '발송'}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800 mt-1">{q.customerName ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatDateShort(q.createdAt)}</p>
            </button>
          ))
        )}
      </div>

      {/* 우측: 타임라인 */}
      <div className="flex-1">
        {!selectedQuote ? (
          <div className="py-20 text-center">
            <p className="text-sm text-gray-400">
              왼쪽에서 견적을 선택하면 승인 이력이 표시됩니다.
            </p>
          </div>
        ) : histLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">이력을 불러오는 중...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* 견적 요약 */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                #{selectedQuote.id}
              </span>
              <span className="text-sm font-medium text-gray-800">
                {selectedQuote.customerName ?? '—'}
              </span>
              <span
                className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                  lastHistory?.afterStatus === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : lastHistory?.afterStatus === 'REJECTED'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {lastHistory?.afterStatus === 'APPROVED'
                  ? '승인 완료'
                  : lastHistory?.afterStatus === 'REJECTED'
                  ? '반려'
                  : '검토 대기'}
              </span>
            </div>

            {/* 타임라인 */}
            <div className="px-5 py-5">
              {histories.length === 0 ? (
                <p className="text-sm text-gray-400 py-5 text-center">이력이 없습니다.</p>
              ) : (
                <div className="flex flex-col">
                  {histories.map((h, idx) => (
                    <div key={h.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            ACTION_DOT_COLOR[h.action] ?? 'bg-gray-400'
                          }`}
                        >
                          <span className="text-white text-xs font-bold">
                            {h.action === 'APPROVED'
                              ? '✓'
                              : h.action === 'REJECTED'
                              ? '✗'
                              : h.action === 'REQUESTED'
                              ? '↑'
                              : '↺'}
                          </span>
                        </div>
                        {idx < histories.length - 1 && (
                          <div className="w-px flex-1 bg-gray-200 my-1 min-h-6" />
                        )}
                      </div>

                      <div className="pb-5 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-sm font-semibold ${
                              ACTION_TEXT_COLOR[h.action] ?? 'text-gray-700'
                            }`}
                          >
                            {ACTION_LABEL[h.action] ?? h.action}
                          </span>
                          <span className="text-xs text-gray-400">by {h.actorName}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">{formatDate(h.actedAt)}</p>
                        {h.memo && (
                          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            {h.memo}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────
export default function StaffApprovalPage() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="px-8 pt-8 pb-5 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-800">승인 요청 관리</h1>
        <p className="text-sm text-gray-400 mt-1">
          승인 요청 현황과 이력을 확인하세요.
        </p>
      </div>

      <div className="px-8 border-b border-gray-200 bg-white flex gap-0">
        {TABS.map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setActiveTab(idx)}
            className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === idx
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="px-8 py-6">
        {activeTab === 0 && <RequestTab />}
        {activeTab === 1 && <RejectReRequestTab />}
        {activeTab === 2 && <HistoryTab />}
      </div>
    </div>
  )
}
