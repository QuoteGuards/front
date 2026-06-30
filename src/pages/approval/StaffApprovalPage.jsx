import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import {
  reRequestApproval,
  updateApprovalMemo,
  getApprovalHistories,
  getApprovalReasons,
  getMyPendingApprovalQuotes,
  getMyRevisingQuotes,
  getMyAllQuotes,
} from '../../api/approvalApi'
import { getInternalAnalysis } from '../../api/quoteApi'

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

const REASON_BADGE_STYLE = {
  DISCOUNT_EXCEEDED: { background: '#FFF7ED', color: '#C2410C', border: '1px solid #FDBA74' },
  LOW_PROFIT:        { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' },
  HIGH_AMOUNT:       { background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' },
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
  if (hours > 0) return `약 ${hours}시간 ${minutes}분`
  return `${minutes}분`
}

function buildGuideSteps(reasons) {
  const steps = []
  let n = 1

  if (reasons.some((r) => r.reasonType === 'DISCOUNT_EXCEEDED')) {
    const msg = reasons.find((r) => r.reasonType === 'DISCOUNT_EXCEEDED')?.message
    steps.push({
      step: n++,
      title: '할인율 조정',
      desc: msg || '카테고리별 최대 할인율 이하로 변경 필요',
      required: true,
    })
  }
  if (reasons.some((r) => r.reasonType === 'LOW_PROFIT')) {
    const msg = reasons.find((r) => r.reasonType === 'LOW_PROFIT')?.message
    steps.push({
      step: n++,
      title: '이익률 확인',
      desc: msg || '제품 구성으로 최소 이익률 이상 확인 필요',
      required: true,
    })
  }
  if (reasons.some((r) => r.reasonType === 'HIGH_AMOUNT')) {
    const msg = reasons.find((r) => r.reasonType === 'HIGH_AMOUNT')?.message
    steps.push({
      step: n++,
      title: '견적 금액 검토',
      desc: msg || '고액 견적 기준을 초과하였습니다. 금액을 검토하세요.',
      required: true,
    })
  }

  steps.push({
    step: n++,
    title: '고객 협의',
    desc: '변경된 조건을 사전 협의하거나 고객의 동의를 확인하세요.',
    required: false,
  })
  steps.push({
    step: n++,
    title: '메모 업데이트',
    desc: '변경 사항과 고객 반응을 상담 메모에 기록해두세요.',
    required: false,
  })

  return steps
}

const TEMP_KEY = (id) => `reRequestMemo_${id}`

// ── 탭 1: 승인 요청 ───────────────────────────────────────
function RequestTab() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [detailMap, setDetailMap] = useState({})
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editMemo, setEditMemo] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  // eslint-disable-next-line react-hooks/immutability
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

                        {detail?.reasons?.length > 0 && (
                          <div className="bg-white rounded-lg border border-gray-100 px-4 py-3">
                            <p className="text-xs text-gray-400 mb-2">승인 필요 사유</p>
                            <div className="flex flex-wrap gap-1.5">
                              {detail.reasons.map((r) => {
                                const s = REASON_BADGE_STYLE[r.reasonType] ?? { background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }
                                return (
                                  <span key={r.id} style={{ ...s, padding: '2px 10px', fontSize: '12px', borderRadius: '9999px', display: 'inline-block' }}>
                                    {REASON_LABEL[r.reasonType] ?? r.reasonType}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}

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
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [histories, setHistories] = useState([])
  const [reasons, setReasons] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reRequestMemo, setReRequestMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [tempSaved, setTempSaved] = useState(false)

  // eslint-disable-next-line react-hooks/immutability
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
    setSelectedQuote(q)
    setReRequestMemo(localStorage.getItem(TEMP_KEY(q.id)) ?? '')
    setError('')
    setTempSaved(false)
    setDetailLoading(true)
    try {
      const [histRes, reasonRes, analysisData] = await Promise.all([
        getApprovalHistories(q.id),
        getApprovalReasons(q.id),
        getInternalAnalysis(q.id).catch(() => null),
      ])
      setHistories(histRes.data ?? [])
      setReasons(reasonRes.data ?? [])
      setAnalysis(analysisData ?? null)
    } catch {
      setHistories([])
      setReasons([])
      setAnalysis(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleBack = () => {
    setSelectedQuote(null)
    setHistories([])
    setReasons([])
    setAnalysis(null)
    setError('')
    setTempSaved(false)
  }

  const handleTempSave = () => {
    if (!selectedQuote) return
    localStorage.setItem(TEMP_KEY(selectedQuote.id), reRequestMemo)
    setTempSaved(true)
    setTimeout(() => setTempSaved(false), 2000)
  }

  const handleReRequest = async () => {
    if (!reRequestMemo.trim()) { setError('재요청 사유를 입력해주세요.'); return }
    setError('')
    setSubmitting(true)
    try {
      const rejectedEntry = [...histories].reverse().find((h) => h.action === 'REJECTED')
      const approvalRequestId = rejectedEntry?.approvalRequestId
      if (!approvalRequestId) {
        setError('승인 요청 정보를 찾을 수 없습니다.')
        setSubmitting(false)
        return
      }
      await reRequestApproval(selectedQuote.id, approvalRequestId, reRequestMemo.trim())
      localStorage.removeItem(TEMP_KEY(selectedQuote.id))
      handleBack()
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

  const maxDiscountRate = analysis?.items?.length > 0
    ? Math.max(...analysis.items.map((i) => Number(i.discountRate ?? 0)))
    : null

  const guideSteps = buildGuideSteps(reasons)

  if (loading) {
    return <p className="text-sm text-gray-400 py-10 text-center">목록을 불러오는 중...</p>
  }

  // ── 목록 화면 ────────────────────────────────────────────
  if (!selectedQuote) {
    if (quotes.length === 0) {
      return (
        <div className="py-20 text-center">
          <p className="text-sm text-gray-400">반려된 견적이 없습니다.</p>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-3">
        {quotes.map((q) => (
          <button
            key={q.id}
            onClick={() => selectQuote(q)}
            className="w-full text-left bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-red-300 hover:bg-red-50/40 transition-all shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                  #{q.id}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{q.customerName ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateShort(q.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs rounded-full bg-red-100 text-red-600 border border-red-200 font-medium">
                  반려됨
                </span>
                <span className="text-gray-300 text-sm group-hover:text-red-400 transition-colors">→</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }

  // ── 로딩 ─────────────────────────────────────────────────
  if (detailLoading) {
    return (
      <div className="py-20 text-center text-sm text-gray-400">정보를 불러오는 중...</div>
    )
  }

  // ── 상세 화면 ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

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
            {reasons.map((r) => {
              const s = REASON_BADGE_STYLE[r.reasonType] ?? { background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }
              return (
                <span key={r.id} style={{ ...s, padding: '2px 10px', fontSize: '12px', borderRadius: '9999px', display: 'inline-block' }}>
                  {REASON_LABEL[r.reasonType] ?? r.reasonType}
                </span>
              )
            })}
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
              { step: 2, title: '견적 수정', desc: '견적 목록에서 해당 견적을 열어 문제 항목을 수정하세요.' },
              { step: 3, title: '재요청 사유 작성', desc: '수정 내용과 개선 근거를 아래에 작성하세요.' },
              { step: 4, title: '재요청 제출', desc: '재요청 버튼을 눌러 관리자에게 다시 검토 요청하세요.' },
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
  )
}

// ── 탭 3: 승인 이력 ──────────────────────────────────────
const HISTORY_STATUS = {
  APPROVAL_PENDING: { text: '검토 대기', cls: 'bg-amber-100 text-amber-700' },
  REVISING:         { text: '반려',     cls: 'bg-red-100 text-red-600' },
  APPROVED:         { text: '최종 승인', cls: 'bg-emerald-100 text-emerald-700' },
  SENT:             { text: '발송 완료', cls: 'bg-blue-100 text-blue-700' },
}

function HistoryTab() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [histories, setHistories] = useState([])
  const [histLoading, setHistLoading] = useState(false)

  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await getMyAllQuotes()
      const all = res.data?.data ?? []
      setQuotes(
        all.filter((q) => ['APPROVED', 'SENT'].includes(q.status))
      )
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }

  const selectQuote = async (q) => {
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

  const handleBack = () => {
    setSelectedQuote(null)
    setHistories([])
  }

  const firstRequested = histories.find((h) => h.action === 'REQUESTED')
  const lastAction = histories.length > 0 ? histories[histories.length - 1] : null
  const totalTime = elapsedTime(firstRequested?.actedAt, lastAction?.actedAt)
  const requesterName = firstRequested?.actorName ?? null

  if (loading) {
    return <p className="text-sm text-gray-400 py-10 text-center">목록을 불러오는 중...</p>
  }

  // ── 목록 화면 ─────────────────────────────────────────────
  if (!selectedQuote) {
    if (quotes.length === 0) {
      return (
        <div className="py-20 text-center">
          <p className="text-sm text-gray-400">조회할 이력이 없습니다.</p>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-3">
        {quotes.map((q) => {
          const badge = HISTORY_STATUS[q.status] ?? { text: q.status, cls: 'bg-gray-100 text-gray-600' }
          return (
            <button
              key={q.id}
              onClick={() => selectQuote(q)}
              className="w-full text-left bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-violet-300 hover:bg-violet-50/30 transition-all shadow-sm group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                    #{q.id}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{q.customerName ?? '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateShort(q.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${badge.cls}`}>
                    {badge.text}
                  </span>
                  <span className="text-gray-300 text-sm group-hover:text-violet-400 transition-colors">→</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  // ── 로딩 ─────────────────────────────────────────────────
  if (histLoading) {
    return <div className="py-20 text-center text-sm text-gray-400">이력을 불러오는 중...</div>
  }

  // ── 상세 화면 ─────────────────────────────────────────────
  const badge = HISTORY_STATUS[selectedQuote.status] ?? { text: selectedQuote.status, cls: 'bg-gray-100 text-gray-600' }

  return (
    <div className="flex flex-col gap-4">

      {/* 견적 요약 헤더 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
              #{selectedQuote.id}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{selectedQuote.customerName ?? '—'}</p>
              {requesterName && (
                <p className="text-xs text-gray-400 mt-0.5">{requesterName} (영업사원)</p>
              )}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
            {badge.text}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">견적 작성일</p>
            <p className="text-sm font-medium text-gray-800">{formatDateShort(selectedQuote.createdAt)}</p>
          </div>
          {selectedQuote.totalAmount > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">견적 금액</p>
              <p className="text-sm font-medium text-gray-800">
                {Number(selectedQuote.totalAmount).toLocaleString('ko-KR')}원
              </p>
            </div>
          )}
          {totalTime && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">총 소요시간</p>
              <p className="text-sm font-medium text-gray-800">{totalTime}</p>
            </div>
          )}
        </div>
      </div>

      {/* 처리 타임라인 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">처리 타임라인</h3>
        </div>
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

                  <div className="pb-6 flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            ACTION_TEXT_COLOR[h.action] ?? 'text-gray-700'
                          }`}
                        >
                          {ACTION_LABEL[h.action] ?? h.action}
                        </span>
                        <span className="text-xs text-gray-400">{h.actorName}</span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-4">
                        {formatDate(h.actedAt)}
                      </span>
                    </div>
                    {h.memo && (
                      <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 mt-1.5">
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

      {/* 하단 버튼 */}
      <div className="flex items-center pt-2 pb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← 목록
        </button>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────
export default function StaffApprovalPage() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div>
      <PageHeader breadcrumbs={['승인 관리', '내 승인 요청']} title="승인 요청 현황" />

      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--color-border)',
          background: '#fff',
          marginBottom: '24px',
        }}
      >
        {TABS.map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setActiveTab(idx)}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: activeTab === idx ? 600 : 400,
              color: activeTab === idx ? 'var(--color-primary)' : 'var(--color-text-sub)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === idx ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 0 && <RequestTab />}
        {activeTab === 1 && <RejectReRequestTab />}
        {activeTab === 2 && <HistoryTab />}
      </div>
    </div>
  )
}
