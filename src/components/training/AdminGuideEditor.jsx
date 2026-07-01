import { useState } from 'react'
import Button from '../common/Button'
import {
  DEFAULT_GUIDE_CONTENT,
  parseGuideContent,
  serializeGuideContent,
} from '../../utils/guideContent'

const linesToItems = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

const itemsToLines = (items) => (items ?? []).join('\n')

const stepsToText = (steps) =>
  (steps ?? [])
    .map((s) => `${s.title}|${s.description}`)
    .join('\n')

const textToSteps = (text) =>
  linesToItems(text).map((line) => {
    const [title, ...rest] = line.split('|')
    return { title: title.trim(), description: rest.join('|').trim() }
  })

const rowsToText = (rows) =>
  (rows ?? [])
    .map((r) => `${r.label}|${r.maxDiscount}|${r.minProfit}|${r.action}`)
    .join('\n')

const textToRows = (text) =>
  linesToItems(text).map((line) => {
    const [label, maxDiscount, minProfit, action] = line.split('|')
    return {
      label: label?.trim() ?? '',
      maxDiscount: maxDiscount?.trim() ?? '',
      minProfit: minProfit?.trim() ?? '',
      action: action?.trim() ?? '',
    }
  })

/** @param {import('../../utils/guideContent').GuideContentData} data */
function contentDataToForm(data) {
  return {
    procedureIntro: data.procedure.intro,
    procedureSteps: stepsToText(data.procedure.steps),
    discountIntro: data.discount.intro,
    discountRows: rowsToText(data.discount.rows),
    discountNote: data.discount.note,
    approvalIntro: data.approval.intro,
    approvalRequired: itemsToLines(data.approval.requiredItems),
    approvalImmediate: itemsToLines(data.approval.immediateItems),
    exampleTitle: data.example.title,
    exampleRequest: data.example.request,
    exampleLines: itemsToLines(data.example.lines),
    exampleOutcome: data.example.outcome,
  }
}

function guideContentToForm(guideContent) {
  return contentDataToForm(parseGuideContent(guideContent))
}

/**
 * @param {{ guideContent: string, onSave: (json: string) => Promise<void>, saving: boolean }} props
 */
export default function AdminGuideEditor({ guideContent, onSave, saving }) {
  const [form, setForm] = useState(() => guideContentToForm(guideContent))
  const [error, setError] = useState('')

  const setField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const loadDefaults = () => {
    setForm(contentDataToForm(DEFAULT_GUIDE_CONTENT))
    setError('')
  }

  const handleSave = async () => {
    setError('')
    const steps = textToSteps(form.procedureSteps)
    const rows = textToRows(form.discountRows)
    if (steps.some((s) => !s.title || !s.description)) {
      setError('작성 절차는 「제목|설명」 형식으로 한 줄에 하나씩 입력해주세요.')
      return
    }
    if (rows.some((r) => !r.label)) {
      setError('할인율 표는 「구분|최대할인|최소이익|초과시」 형식으로 입력해주세요.')
      return
    }

    const payload = serializeGuideContent({
      procedure: { intro: form.procedureIntro, steps },
      discount: { intro: form.discountIntro, note: form.discountNote, rows },
      approval: {
        intro: form.approvalIntro,
        requiredTitle: '승인 요청이 필요한 경우',
        requiredItems: linesToItems(form.approvalRequired),
        immediateTitle: '승인 없이 진행 가능한 경우',
        immediateItems: linesToItems(form.approvalImmediate),
      },
      example: {
        title: form.exampleTitle,
        request: form.exampleRequest,
        lines: linesToItems(form.exampleLines),
        outcome: form.exampleOutcome,
      },
    })

    await onSave(payload)
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-white)] p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--color-text-main)]">견적 작성 가이드 편집</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            저장 시 `training_contents.guide_content`에 JSON으로 반영됩니다. 영업사원 가이드 모달에 즉시 표시됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" type="button" onClick={loadDefaults} disabled={saving}>
            기본값 불러오기
          </Button>
          <Button variant="primary" size="sm" type="button" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중…' : '가이드 저장'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <GuideField label="① 견적 작성 절차 · 안내 문구">
        <textarea className="form-input min-h-[72px]" value={form.procedureIntro} onChange={setField('procedureIntro')} />
      </GuideField>
      <GuideField label="① 작성 절차 (한 줄 = 제목|설명)">
        <textarea className="form-input min-h-[120px] font-mono text-xs" value={form.procedureSteps} onChange={setField('procedureSteps')} />
      </GuideField>

      <GuideField label="② 할인율 · 안내 문구">
        <textarea className="form-input min-h-[72px]" value={form.discountIntro} onChange={setField('discountIntro')} />
      </GuideField>
      <GuideField label="② 할인율 표 (한 줄 = 구분|최대할인|최소이익|초과시)">
        <textarea className="form-input min-h-[80px] font-mono text-xs" value={form.discountRows} onChange={setField('discountRows')} />
      </GuideField>
      <GuideField label="② 할인율 · 주의 문구">
        <textarea className="form-input min-h-[56px]" value={form.discountNote} onChange={setField('discountNote')} />
      </GuideField>

      <GuideField label="③ 승인 조건 · 안내 문구">
        <textarea className="form-input min-h-[72px]" value={form.approvalIntro} onChange={setField('approvalIntro')} />
      </GuideField>
      <GuideField label="③ 승인 필요 (한 줄에 하나)">
        <textarea className="form-input min-h-[96px]" value={form.approvalRequired} onChange={setField('approvalRequired')} />
      </GuideField>
      <GuideField label="③ 승인 불필요 (한 줄에 하나)">
        <textarea className="form-input min-h-[96px]" value={form.approvalImmediate} onChange={setField('approvalImmediate')} />
      </GuideField>

      <GuideField label="④ 예시 · 제목">
        <input className="form-input" value={form.exampleTitle} onChange={setField('exampleTitle')} />
      </GuideField>
      <GuideField label="④ 예시 · 고객 요청">
        <textarea className="form-input min-h-[72px]" value={form.exampleRequest} onChange={setField('exampleRequest')} />
      </GuideField>
      <GuideField label="④ 예시 · 계산/판단 (한 줄에 하나)">
        <textarea className="form-input min-h-[96px]" value={form.exampleLines} onChange={setField('exampleLines')} />
      </GuideField>
      <GuideField label="④ 예시 · 결과">
        <textarea className="form-input min-h-[72px]" value={form.exampleOutcome} onChange={setField('exampleOutcome')} />
      </GuideField>
    </section>
  )
}

function GuideField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--color-text-sub)] mb-1.5">{label}</label>
      {children}
    </div>
  )
}
