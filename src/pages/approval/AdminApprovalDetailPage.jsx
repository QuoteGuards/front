import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getApprovalDetail,
  getManagerApprovalDetail,
  approveQuote,
  rejectQuote,
  getAiRiskSummary,
  getManagerAiRiskSummary,
} from '../../api/approvalApi'
import { useAuth } from '../../hooks/useAuth'
import { useTrainingStatusContext } from '../../contexts/TrainingStatusContext'
import QuoteAccessRestricted from '../../components/quote/QuoteAccessRestricted'
import PageHeader from '../../components/common/PageHeader'

const REASON_LABEL = {
  DISCOUNT_EXCEEDED: '할인율 초과',
  LOW_PROFIT: '이익률 미달',
  HIGH_AMOUNT: '고액 견적',
}

const REASON_COLOR = {
  DISCOUNT_EXCEEDED: 'bg-orange-50 text-orange-700 border-orange-200',
  LOW_PROFIT: 'bg-red-50 text-red-700 border-red-200',
  HIGH_AMOUNT: 'bg-purple-50 text-purple-700 border-purple-200',
}

const ACTION_LABEL = {
  REQUESTED: '승인 요청',
  APPROVED: '승인 완료',
  REJECTED: '반려',
  RE_REQUESTED: '재요청',
}

const ACTION_COLOR = {
  REQUESTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-600',
  RE_REQUESTED: 'bg-violet-100 text-violet-700',
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right">{value}</span>
    </div>
  )
}

function formatWon(value) {
  return `${Number(value ?? 0).toLocaleString('ko-KR')}원`
}

function AmountStat({ label, value, danger }) {
  return (
    <div className="flex-1 text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-base font-bold ${danger ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}

export default function AdminApprovalDetailPage() {
  const { approvalRequestId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { loading: trainingLoading, canReviewApproval } = useTrainingStatusContext()
  const isManager = user?.role === 'SALES_MANAGER'
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [decision, setDecision] = useState(null) // 'approve' | 'reject'
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [aiSummary, setAiSummary] = useState(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [aiError, setAiError] = useState('')
  const [showItems, setShowItems] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchDetail = user?.role === 'SALES_MANAGER' ? getManagerApprovalDetail : getApprovalDetail
    fetchDetail(approvalRequestId)
      .then((res) => { if (!cancelled) setDetail(res.data) })
      .catch((e) => { if (!cancelled) setError(e.response?.data?.message ?? '상세 정보를 불러오지 못했습니다.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [approvalRequestId, user?.role])

  const fetchAiSummary = () => {
    const getSummary = user?.role === 'SALES_MANAGER' ? getManagerAiRiskSummary : getAiRiskSummary
    return getSummary(approvalRequestId)
  }

  useEffect(() => {
    let cancelled = false
    fetchAiSummary()
      .then((res) => { if (!cancelled) setAiSummary(res.data) })
      .catch((e) => { if (!cancelled) setAiError(e.response?.data?.message ?? 'AI 리스크 요약을 생성하지 못했습니다.') })
      .finally(() => { if (!cancelled) setAiLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvalRequestId, user?.role])

  const retryAiSummary = () => {
    setAiLoading(true)
    setAiError('')
    fetchAiSummary()
      .then((res) => setAiSummary(res.data))
      .catch((e) => setAiError(e.response?.data?.message ?? 'AI 리스크 요약을 생성하지 못했습니다.'))
      .finally(() => setAiLoading(false))
  }

  const handleSubmit = async () => {
    if (!decision) { setError('승인 또는 반려를 선택해주세요.'); return }
    if (decision === 'reject' && !memo.trim()) { setError('반려 사유를 입력해주세요.'); return }
    setError('')
    setSubmitting(true)
    try {
      if (decision === 'approve') {
        await approveQuote(detail.quoteId, detail.id, memo.trim())
      } else {
        await rejectQuote(detail.quoteId, detail.id, memo.trim())
      }
      navigate('/admin/approval')
    } catch (e) {
      setError(e.response?.data?.message ?? '처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isManager && !trainingLoading && !canReviewApproval) {
    return <QuoteAccessRestricted reason="TRAINING_APPROVAL_NOT_COMPLETED" />
  }

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">상세 정보를 불러오는 중...</p>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex-1 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-3">{error || '데이터를 불러올 수 없습니다.'}</p>
          <button onClick={() => navigate('/admin/approval')} className="text-xs text-violet-600 hover:underline">
            목록으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const isPending = detail.status === 'PENDING'

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <PageHeader breadcrumbs={['승인 관리', '승인 상세']} />
      {/* 헤더 */}
      <div className="px-8 pt-8 pb-5 border-b border-gray-200 bg-white flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/approval')}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← 목록
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <div>
          <h1 className="text-xl font-bold text-gray-800">견적 검토</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            견적 #{detail.quoteId} · 요청자: {detail.requesterName} · {detail.requestCount}회차 요청
          </p>
        </div>
        <div className="ml-auto">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            detail.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
            detail.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
            'bg-red-100 text-red-600'
          }`}>
            {detail.status === 'PENDING' ? '검토 대기' : detail.status === 'APPROVED' ? '승인 완료' : '반려'}
          </span>
        </div>
      </div>

      {/* 본문 2열 레이아웃 */}
      <div className="px-8 py-6 flex gap-5 items-start">
        {/* 왼쪽 패널 */}
        <div className="flex-1 flex flex-col gap-4">
          {/* 견적 요약 */}
          <Section title="견적 요약">
            <InfoRow label="견적 번호" value={`#${detail.quoteId}`} />
            <InfoRow label="영업사원" value={detail.requesterName} />
            <InfoRow label="요청일" value={detail.requestedAt ? new Date(detail.requestedAt).toLocaleString('ko-KR') : '—'} />
            <InfoRow label="요청 횟수" value={`${detail.requestCount}회차`} />
            {detail.processedAt && (
              <InfoRow label="처리일" value={new Date(detail.processedAt).toLocaleString('ko-KR')} />
            )}

            <div className="flex items-stretch gap-2 mt-3 pt-3 border-t border-gray-100">
              <AmountStat label="견적금액" value={formatWon(detail.totalAmount)} />
              <AmountStat label="예상이익" value={formatWon(detail.expectedProfitAmount)} />
              <AmountStat
                label="예상 이익률"
                value={`${Number(detail.profitRate ?? 0)}%`}
                danger={detail.reasons?.some((r) => r.reasonType === 'LOW_PROFIT')}
              />
            </div>

            {detail.items?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setShowItems((prev) => !prev)}
                  className="text-xs font-medium text-violet-600 hover:text-violet-700"
                >
                  {showItems ? '품목 접기 ▲' : '품목 보기 ▼'}
                </button>
                {showItems && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {detail.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                        <span className="truncate">{item.productName} × {Number(item.quantity)}</span>
                        <span className="shrink-0 text-gray-800 font-medium">{formatWon(item.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* 리스크 판단 항목 */}
          <Section title="리스크 판단 항목">
            {detail.reasons?.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">감지된 리스크 항목이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {detail.reasons?.map((r) => (
                  <div key={r.id} className="flex items-start gap-3">
                    <span className={`mt-0.5 px-2 py-0.5 text-xs rounded-full border shrink-0 ${REASON_COLOR[r.reasonType] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {REASON_LABEL[r.reasonType] ?? r.reasonType}
                    </span>
                    <p className="text-sm text-gray-600">{r.message}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 상담 메모 */}
          <Section title="요청 메모">
            {detail.requestMemo ? (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{detail.requestMemo}</p>
            ) : (
              <p className="text-xs text-gray-400">작성된 메모가 없습니다.</p>
            )}
          </Section>

          {/* 승인 이력 */}
          <Section title="처리 이력">
            {detail.histories?.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">이력이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {detail.histories?.map((h, idx) => (
                  <div key={h.id} className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                        {idx + 1}
                      </div>
                      {idx < detail.histories.length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 my-1 min-h-4" />
                      )}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLOR[h.action] ?? 'bg-gray-100 text-gray-500'}`}>
                          {ACTION_LABEL[h.action] ?? h.action}
                        </span>
                        <span className="text-xs text-gray-400">{h.actorName}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">
                          {h.actedAt ? new Date(h.actedAt).toLocaleString('ko-KR') : '—'}
                        </span>
                      </div>
                      {h.memo && (
                        <p className="text-xs text-gray-500 leading-relaxed">{h.memo}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 관리자 결정 (PENDING인 경우만) */}
          {isPending && (
            <Section title="관리자 결정">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setDecision('approve'); setMemo(''); setError('') }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    decision === 'approve'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-emerald-50 hover:border-emerald-400'
                  }`}
                >
                  ✓ 승인
                </button>
                <button
                  onClick={() => { setDecision('reject'); setMemo(''); setError('') }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    decision === 'reject'
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-red-50 hover:border-red-400'
                  }`}
                >
                  ✗ 반려
                </button>
              </div>

              {decision && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {decision === 'approve' ? '승인 메모 (선택)' : '반려 사유 (필수)'}
                  </label>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder={decision === 'approve' ? '승인 관련 메모를 입력하세요.' : '반려 사유를 구체적으로 입력해주세요.'}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}

              {error && (
                <p className="text-xs text-red-500 mb-3">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!decision || submitting}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  !decision || submitting
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : decision === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {submitting ? '처리 중...' : decision === 'approve' ? '승인 처리' : '반려 처리'}
              </button>
            </Section>
          )}
        </div>

        {/* 오른쪽 패널: AI 리스크 요약 */}
        <div className="w-80 shrink-0 sticky top-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-violet-100 flex items-center justify-center">
                <span className="text-xs">✦</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-800">AI 리스크 요약</h3>
              <span className="ml-auto text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full border border-violet-200">
                Gemini AI
              </span>
            </div>

            {aiLoading && (
              <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center animate-pulse">
                  <span className="text-lg text-gray-300">✦</span>
                </div>
                <p className="text-sm text-gray-400">AI가 견적을 분석하고 있습니다...</p>
              </div>
            )}

            {!aiLoading && aiError && (
              <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                  <span className="text-lg text-red-300">!</span>
                </div>
                <p className="text-xs text-red-400 leading-relaxed">{aiError}</p>
                <button
                  onClick={retryAiSummary}
                  className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                >
                  다시 시도
                </button>
              </div>
            )}

            {!aiLoading && !aiError && aiSummary && (
              <div className="px-5 py-4">
                {aiSummary.cached && (
                  <p className="text-[11px] text-gray-300 mb-2">이전에 생성된 요약입니다</p>
                )}
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {aiSummary.aiRiskSummary}
                </p>
              </div>
            )}

            {/* 리스크 항목 집계 */}
            {detail.reasons?.length > 0 && (
              <div className="px-5 pb-4 border-t border-gray-50 pt-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">감지된 리스크</p>
                <div className="flex flex-col gap-1.5">
                  {detail.reasons.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      {REASON_LABEL[r.reasonType] ?? r.reasonType}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
