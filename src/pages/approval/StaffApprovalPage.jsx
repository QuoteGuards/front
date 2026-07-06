import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import {
  reRequestApproval,
  updateApprovalMemo,
  cancelApprovalRequest,
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
    step: n,
    title: '메모 업데이트',
    desc: '변경 사항과 고객 반응을 상담 메모에 기록해두세요.',
    required: false,
  })

  return steps
}

const TEMP_KEY = (id) => `reRequestMemo_${id}`

// ── 공용: 좌측 목록 / 우측 상세 분할 레이아웃 ────────────────
function SplitLayout({ list, detail }) {
  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start">
      <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-2">
        {list}
      </div>
      <div className="flex-1 min-w-0 w-full">
        {detail}
      </div>
    </div>
  )
}

// ── 공용: 목록 항목 행 ────────────────────────────────────
function ListRow({ active, onClick, id, title, subtitle, badge }) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left rounded-lg border px-4 py-3 transition-colors',
        active ? 'border-violet-400 bg-violet-50' : 'border-gray-200 bg-white hover:bg-gray-50',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 shrink-0">#{id}</span>
        <span className="text-sm font-medium text-gray-800 truncate">{title}</span>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-gray-400">{subtitle}</span>
        {badge}
      </div>
    </button>
  )
}

// ── 공용: 우측 상세 패널이 비어있을 때 ────────────────────
function EmptyDetail({ text }) {
  return (
    <div className="min-h-[320px] flex items-center justify-center bg-white rounded-xl border border-dashed border-gray-200">
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  )
}

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
  const [cancelLoadingId, setCancelLoadingId] = useState(null)
  const [cancelError, setCancelError] = useState('')

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

  const selectQuote = async (q) => {
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

  const handleCancelRequest = async (q, approvalRequestId) => {
    if (!approvalRequestId) return
    if (!window.confirm('이 승인 요청을 철회하시겠습니까? 견적은 임시저장 상태로 돌아가며, 다시 처음부터 제출해야 합니다.')) return
    setCancelError('')
    setCancelLoadingId(q.id)
    try {
      await cancelApprovalRequest(q.id, approvalRequestId)
      setQuotes((prev) => prev.filter((item) => item.id !== q.id))
      setSelectedId(null)
    } catch (e) {
      setCancelError(e.response?.data?.message ?? '철회 중 오류가 발생했습니다.')
    } finally {
      setCancelLoadingId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400 py-10 text-center">목록을 불러오는 중...</p>
  }

  if (quotes.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-gray-400">승인 대기 중인 견적이 없습니다.</p>
        <p className="text-xs text-gray-300 mt-1">
          승인이 필요한 견적은 견적 목록에서 먼저 제출하세요.
        </p>
      </div>
    )
  }

  const selectedQuote = quotes.find((q) => q.id === selectedId) ?? null
  const detail = selectedId ? detailMap[selectedId] : null
  const lastRequest = detail?.histories
    ? [...detail.histories].reverse().find((h) => h.action === 'REQUESTED' || h.action === 'RE_REQUESTED')
    : null
  const requestCount = detail?.histories?.filter(
    (h) => h.action === 'REQUESTED' || h.action === 'RE_REQUESTED'
  ).length ?? 0
  const approvalRequestId = lastRequest?.approvalRequestId
  const isEditing = editingId === selectedId

  return (
    <div>
      {cancelError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {cancelError}
        </div>
      )}
      {saveSuccess && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {saveSuccess}
        </div>
      )}

      <SplitLayout
        list={quotes.map((q) => (
          <ListRow
            key={q.id}
            id={q.id}
            active={selectedId === q.id}
            onClick={() => selectQuote(q)}
            title={q.customerName ?? '—'}
            subtitle={`제출일: ${formatDateShort(q.submittedAt ?? q.createdAt)}`}
            badge={
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                대기
              </span>
            }
          />
        ))}
        detail={
          !selectedQuote ? (
            <EmptyDetail text="왼쪽 목록에서 견적을 선택하세요." />
          ) : detailLoading && !detail ? (
            <div className="min-h-[320px] flex items-center justify-center bg-white rounded-xl border border-gray-200">
              <p className="text-xs text-gray-400">불러오는 중...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                  #{selectedQuote.id}
                </span>
                <p className="text-sm font-semibold text-gray-800">{selectedQuote.customerName ?? '—'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
                  <p className="text-xs text-gray-400">요청일시</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">
                    {formatDate(lastRequest?.actedAt ?? selectedQuote.submittedAt)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
                  <p className="text-xs text-gray-400">요청 횟수</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">
                    {requestCount > 0 ? `${requestCount}회` : '1회'}
                  </p>
                </div>
              </div>

              {detail?.reasons?.length > 0 && (
                <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
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

              <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-gray-400">전달한 메모</p>
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(lastRequest?.memo)}
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
                    />
                    {saveError && (
                      <p className="text-xs text-red-500 mt-1.5">{saveError}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleSaveMemo(selectedQuote, approvalRequestId)}
                        disabled={saveLoading}
                      >
                        {saveLoading ? '저장 중...' : '저장'}
                      </Button>
                      <Button variant="ghost" onClick={cancelEdit} disabled={saveLoading}>
                        취소
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[1.5rem]">
                    {lastRequest?.memo || <span className="text-gray-300">작성된 메모가 없습니다.</span>}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 px-1 pt-1 border-t border-gray-100">
                <p className="text-xs text-amber-600 pt-3">
                  관리자 검토를 기다리고 있습니다. 승인되면 고객에게 견적을 발송할 수 있습니다.
                </p>
                <button
                  onClick={() => handleCancelRequest(selectedQuote, approvalRequestId)}
                  disabled={cancelLoadingId === selectedQuote.id}
                  className="shrink-0 text-xs text-gray-400 hover:text-red-500 font-medium disabled:opacity-50 pt-3"
                >
                  {cancelLoadingId === selectedQuote.id ? '철회 중...' : '요청 철회'}
                </button>
              </div>
            </div>
          )
        }
      />
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

  const resetSelection = () => {
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
      resetSelection()
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

  if (quotes.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-gray-400">반려된 견적이 없습니다.</p>
      </div>
    )
  }

  return (
    <SplitLayout
      list={quotes.map((q) => (
        <ListRow
          key={q.id}
          id={q.id}
          active={selectedQuote?.id === q.id}
          onClick={() => selectQuote(q)}
          title={q.customerName ?? '—'}
          subtitle={formatDateShort(q.createdAt)}
          badge={
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-red-100 text-red-600 border border-red-200 font-medium">
              반려됨
            </span>
          }
        />
      ))}
      detail={
        !selectedQuote ? (
          <EmptyDetail text="왼쪽 목록에서 반려된 견적을 선택하세요." />
        ) : detailLoading ? (
          <div className="min-h-[320px] flex items-center justify-center bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-400">정보를 불러오는 중...</p>
          </div>
        ) : (
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

            {/* 원 요청 정보 */}
            {(requestedEntry || maxDiscountRate !== null) && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">원 요청 정보</h3>
                </div>
                <div className="px-5 py-4 grid grid-cols-2 gap-3">
                  {requestedEntry && (
                    <div>
                      <p className="text-xs text-gray-400">최초 요청일시</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">
                        {formatDate(requestedEntry.actedAt)}
                      </p>
                    </div>
                  )}
                  {maxDiscountRate !== null && (
                    <div>
                      <p className="text-xs text-gray-400">최대 할인율</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">
                        {maxDiscountRate.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
                {requestedEntry?.memo && (
                  <div className="px-5 pb-4">
                    <p className="text-xs text-gray-400 mb-1">최초 요청 메모</p>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 whitespace-pre-wrap">
                      {requestedEntry.memo}
                    </p>
                  </div>
                )}
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
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">수정 가이드</h3>
                <button
                  onClick={() => navigate(`/quotes/new?id=${selectedQuote.id}`)}
                  className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                >
                  견적 수정하러 가기 →
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="flex flex-col gap-3">
                  {guideSteps.map(({ step, title, desc, required }) => (
                    <div key={step} className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {step}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-800">{title}</p>
                          {required && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 border border-red-100">
                              필수
                            </span>
                          )}
                        </div>
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
                <p className="text-xs text-gray-400 mt-1">
                  재요청하면 위 리스크 항목은 최신 견적 내용을 기준으로 다시 계산되어 갱신됩니다.
                </p>
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
                {tempSaved && <p className="text-xs text-emerald-600 mt-2">임시 저장되었습니다.</p>}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleTempSave}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed"
                  >
                    임시저장
                  </button>
                  <button
                    onClick={handleReRequest}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {submitting ? '처리 중...' : '재요청하기'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    />
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

  const firstRequested = histories.find((h) => h.action === 'REQUESTED')
  const lastAction = histories.length > 0 ? histories[histories.length - 1] : null
  const totalTime = elapsedTime(firstRequested?.actedAt, lastAction?.actedAt)
  const requesterName = firstRequested?.actorName ?? null

  if (loading) {
    return <p className="text-sm text-gray-400 py-10 text-center">목록을 불러오는 중...</p>
  }

  if (quotes.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-gray-400">조회할 이력이 없습니다.</p>
      </div>
    )
  }

  const badge = selectedQuote
    ? HISTORY_STATUS[selectedQuote.status] ?? { text: selectedQuote.status, cls: 'bg-gray-100 text-gray-600' }
    : null

  return (
    <SplitLayout
      list={quotes.map((q) => {
        const rowBadge = HISTORY_STATUS[q.status] ?? { text: q.status, cls: 'bg-gray-100 text-gray-600' }
        return (
          <ListRow
            key={q.id}
            id={q.id}
            active={selectedQuote?.id === q.id}
            onClick={() => selectQuote(q)}
            title={q.customerName ?? '—'}
            subtitle={formatDateShort(q.createdAt)}
            badge={
              <span className={`px-2 py-0.5 text-[11px] rounded-full font-medium ${rowBadge.cls}`}>
                {rowBadge.text}
              </span>
            }
          />
        )
      })}
      detail={
        !selectedQuote ? (
          <EmptyDetail text="왼쪽 목록에서 견적을 선택하세요." />
        ) : histLoading ? (
          <div className="min-h-[320px] flex items-center justify-center bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-400">이력을 불러오는 중...</p>
          </div>
        ) : (
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
          </div>
        )
      }
    />
  )
}

// ── 메인 페이지 ───────────────────────────────────────────
export default function StaffApprovalPage() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div>
      <PageHeader breadcrumbs={['승인', '승인 요청 현황']} title="승인 요청 현황" />

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
