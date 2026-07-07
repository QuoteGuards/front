import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getApprovalHistories,
  getApprovalDetail,
  updateApprovalMemo,
  cancelApprovalRequest,
  reRequestApproval,
} from '../../api/approvalApi'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/StatusBadge'
import {
  REASON_LABEL,
  REASON_BADGE_STYLE,
  ACTION_LABEL,
  ACTION_DOT_COLOR,
  ACTION_TEXT_COLOR,
  formatDate,
  buildGuideSteps,
  TEMP_KEY,
} from './approvalHelpers'

function Section({ title, action, children }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </Card>
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

function formatPercent(value) {
  return `${Number(value ?? 0)}%`
}

function DiffRow({ label, before, after, format }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-sm text-gray-500">{format(before)}</span>
      <span className="text-gray-300 mx-2">→</span>
      <span className="text-sm text-gray-800 font-semibold">{format(after)}</span>
    </div>
  )
}

export default function StaffApprovalDetailPage() {
  const { quoteId } = useParams()
  const navigate = useNavigate()

  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isEditingMemo, setIsEditingMemo] = useState(false)
  const [editMemo, setEditMemo] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  const [reRequestMemo, setReRequestMemo] = useState(() => localStorage.getItem(TEMP_KEY(quoteId)) ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [reRequestError, setReRequestError] = useState('')
  const [tempSaved, setTempSaved] = useState(false)

  const load = () => {
    getApprovalHistories(quoteId)
      .then((histRes) => {
        const histories = histRes.data ?? []
        const lastRequest = [...histories].reverse()
          .find((h) => h.action === 'REQUESTED' || h.action === 'RE_REQUESTED')
        const approvalRequestId = lastRequest?.approvalRequestId
        if (!approvalRequestId) throw new Error('승인 요청 정보를 찾을 수 없습니다.')
        return getApprovalDetail(approvalRequestId)
      })
      .then((res) => setDetail(res.data))
      .catch((e) => setError(e.response?.data?.message ?? e.message ?? '상세 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId])

  const startEditMemo = () => {
    setEditMemo(detail?.requestMemo ?? '')
    setSaveError('')
    setSaveSuccess('')
    setIsEditingMemo(true)
  }

  const handleSaveMemo = async () => {
    setSaveError('')
    setSaveLoading(true)
    try {
      await updateApprovalMemo(detail.quoteId, detail.id, editMemo.trim())
      setDetail((prev) => ({ ...prev, requestMemo: editMemo.trim() }))
      setSaveSuccess('메모가 수정되었습니다.')
      setIsEditingMemo(false)
    } catch (e) {
      setSaveError(e.response?.data?.message ?? '수정 중 오류가 발생했습니다.')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleCancelRequest = async () => {
    if (!window.confirm('이 승인 요청을 철회하시겠습니까? 견적은 임시저장 상태로 돌아가며, 다시 처음부터 제출해야 합니다.')) return
    setCancelLoading(true)
    try {
      await cancelApprovalRequest(detail.quoteId, detail.id)
      navigate('/staff/approval')
    } catch (e) {
      setError(e.response?.data?.message ?? '철회 중 오류가 발생했습니다.')
      setCancelLoading(false)
    }
  }

  const handleTempSave = () => {
    localStorage.setItem(TEMP_KEY(quoteId), reRequestMemo)
    setTempSaved(true)
    setTimeout(() => setTempSaved(false), 2000)
  }

  const handleReRequest = async () => {
    if (!reRequestMemo.trim()) { setReRequestError('재요청 사유를 입력해주세요.'); return }
    setReRequestError('')
    setSubmitting(true)
    try {
      await reRequestApproval(detail.quoteId, detail.id, reRequestMemo.trim())
      localStorage.removeItem(TEMP_KEY(quoteId))
      navigate('/staff/approval')
    } catch (e) {
      setReRequestError(e.response?.data?.message ?? '재요청 중 오류가 발생했습니다.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader breadcrumbs={['승인', '승인 요청 현황', '상세']} title="승인 상세" />
        <p className="text-sm text-gray-400 py-10 text-center">불러오는 중...</p>
      </div>
    )
  }

  if (!detail) {
    return (
      <div>
        <PageHeader breadcrumbs={['승인', '승인 요청 현황', '상세']} title="승인 상세" />
        <div className="text-center py-16">
          <p className="text-sm text-[var(--color-danger)] mb-3">{error || '데이터를 불러올 수 없습니다.'}</p>
          <button onClick={() => navigate('/staff/approval')} className="text-xs text-[var(--color-primary)] hover:underline">
            ← 목록으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const isPending = detail.status === 'PENDING'
  const isRejected = detail.status === 'REJECTED'
  const guideSteps = isRejected ? buildGuideSteps(detail.reasons ?? []) : []

  return (
    <div>
      <PageHeader breadcrumbs={['승인', '승인 요청 현황', '상세']} title="승인 상세" />

      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/staff/approval')} className="text-sm text-gray-400 hover:text-gray-700">
          ← 목록
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
          #{detail.quoteId}
        </span>
        <p className="text-sm text-gray-400">{detail.requestCount}회차 요청</p>
        <div className="ml-auto">
          <StatusBadge status={detail.status} type="approval" />
        </div>
      </div>

      <div className="flex flex-col gap-4 max-w-3xl">
        <Section title="견적 요약">
          <InfoRow label="견적 번호" value={`#${detail.quoteId}`} />
          <InfoRow label="요청일" value={formatDate(detail.requestedAt)} />
          <InfoRow label="요청 횟수" value={`${detail.requestCount}회차`} />
          {detail.processedAt && <InfoRow label="처리일" value={formatDate(detail.processedAt)} />}
          <InfoRow label="견적금액" value={formatWon(detail.totalAmount)} />
          <InfoRow label="예상 이익률" value={`${Number(detail.profitRate ?? 0)}%`} />
        </Section>

        {detail.reasons?.length > 0 && (
          <Section title="승인 필요 사유">
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
          </Section>
        )}

        {isRejected && detail.rejectReason && (
          <Section title="반려 사유">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{detail.rejectReason}</p>
          </Section>
        )}

        {detail.quoteDiff && (
          <Section title="변경 항목 (반려 → 재요청)">
            <DiffRow label="견적금액" before={detail.quoteDiff.totalAmountBefore} after={detail.quoteDiff.totalAmountAfter} format={formatWon} />
            <DiffRow label="예상 이익률" before={detail.quoteDiff.profitRateBefore} after={detail.quoteDiff.profitRateAfter} format={formatPercent} />
            <DiffRow label="할인율" before={detail.quoteDiff.discountRateBefore} after={detail.quoteDiff.discountRateAfter} format={formatPercent} />
          </Section>
        )}

        {isRejected && guideSteps.length > 0 && (
          <Section
            title="수정 가이드"
            action={
              <button
                onClick={() => navigate(`/quotes/new?id=${detail.quoteId}`)}
                className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] font-medium"
              >
                견적 수정하러 가기 →
              </button>
            }
          >
            <div className="flex flex-col gap-3">
              {guideSteps.map(({ step, title, desc, required }) => (
                <div key={step} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-[#EEF4FF] text-[var(--color-primary)] text-xs font-bold flex items-center justify-center shrink-0">
                    {step}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-800">{title}</p>
                      {required && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 border border-red-100">필수</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {isPending && (
          <Section
            title="전달한 메모"
            action={!isEditingMemo && (
              <button onClick={startEditMemo} className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] font-medium">
                메모 수정
              </button>
            )}
          >
            {isEditingMemo ? (
              <>
                <textarea
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  placeholder="관리자에게 전달할 메모를 입력하세요."
                  rows={3}
                  className="form-textarea"
                />
                {saveError && <p className="text-xs text-[var(--color-danger)] mt-1.5">{saveError}</p>}
                <div className="flex gap-2 mt-2">
                  <Button className="flex-1" onClick={handleSaveMemo} disabled={saveLoading}>
                    {saveLoading ? '저장 중...' : '저장'}
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditingMemo(false)} disabled={saveLoading}>
                    취소
                  </Button>
                </div>
              </>
            ) : (
              <>
                {saveSuccess && <p className="text-xs text-[var(--color-success)] mb-2">{saveSuccess}</p>}
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[1.5rem]">
                  {detail.requestMemo || <span className="text-gray-300">작성된 메모가 없습니다.</span>}
                </p>
              </>
            )}
          </Section>
        )}

        {isPending && (
          <Card>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[var(--color-warning)]">
                관리자 검토를 기다리고 있습니다. 승인되면 고객에게 견적을 발송할 수 있습니다.
              </p>
              <button
                onClick={handleCancelRequest}
                disabled={cancelLoading}
                className="shrink-0 text-xs text-gray-400 hover:text-[var(--color-danger)] font-medium disabled:opacity-50"
              >
                {cancelLoading ? '철회 중...' : '요청 철회'}
              </button>
            </div>
          </Card>
        )}

        {isRejected && (
          <Section title="재요청 사유">
            <p className="text-xs text-gray-400 mb-3">
              재요청하면 위 리스크 항목은 최신 견적 내용을 기준으로 다시 계산되어 갱신됩니다.
            </p>
            <textarea
              value={reRequestMemo}
              onChange={(e) => setReRequestMemo(e.target.value)}
              placeholder="수정한 내용과 재요청 사유를 입력하세요."
              rows={4}
              className="form-textarea"
            />
            {reRequestError && <p className="text-xs text-[var(--color-danger)] mt-2">{reRequestError}</p>}
            {tempSaved && <p className="text-xs text-[var(--color-success)] mt-2">임시 저장되었습니다.</p>}
            <div className="flex gap-2 mt-3">
              <Button variant="outline" onClick={handleTempSave} disabled={submitting}>임시저장</Button>
              <Button className="flex-1" onClick={handleReRequest} disabled={submitting}>
                {submitting ? '처리 중...' : '재요청하기'}
              </Button>
            </div>
          </Section>
        )}

        <Section title="처리 타임라인">
          {detail.histories?.length === 0 ? (
            <p className="text-sm text-gray-400 py-5 text-center">이력이 없습니다.</p>
          ) : (
            <div className="flex flex-col">
              {detail.histories.map((h, idx) => (
                <div key={h.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${ACTION_DOT_COLOR[h.action] ?? 'bg-gray-400'}`}>
                      <span className="text-white text-xs font-bold">
                        {h.action === 'APPROVED' ? '✓' : h.action === 'REJECTED' ? '✗' : h.action === 'REQUESTED' ? '↑' : '↺'}
                      </span>
                    </div>
                    {idx < detail.histories.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1 min-h-6" />}
                  </div>
                  <div className="pb-6 flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${ACTION_TEXT_COLOR[h.action] ?? 'text-gray-700'}`}>
                          {ACTION_LABEL[h.action] ?? h.action}
                        </span>
                        <span className="text-xs text-gray-400">{h.actorName}</span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-4">{formatDate(h.actedAt)}</span>
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
        </Section>
      </div>
    </div>
  )
}
