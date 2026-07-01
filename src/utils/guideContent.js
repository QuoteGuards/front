/**
 * 견적 작성 가이드 콘텐츠 (training_contents.guide_content JSON)
 * @typedef {{ title: string, description: string }} GuideStep
 * @typedef {{ label: string, maxDiscount: string, minProfit: string, action: string }} DiscountRow
 * @typedef {{
 *   procedure: { intro: string, steps: GuideStep[] },
 *   discount: { intro: string, note: string, rows: DiscountRow[] },
 *   approval: { intro: string, requiredTitle: string, requiredItems: string[], immediateTitle: string, immediateItems: string[] },
 *   example: { title: string, request: string, lines: string[], outcome: string }
 * }} GuideContentData
 */

/** @type {GuideContentData} */
export const DEFAULT_GUIDE_CONTENT = {
  procedure: {
    intro:
      '견적은 고객 정보 확인 → 제품 구성 → 임시저장 → 내부 분석 → 작성 완료 순서로 진행합니다. 작성 완료 전에는 언제든 임시저장(DRAFT)으로 중간 내용을 보관할 수 있습니다.',
    steps: [
      {
        title: 'STEP 1 · 고객 선택',
        description: '고객명·연락처로 검색하거나 신규 고객을 등록합니다. 선택한 고객 정보는 견적 발행 시점 기준으로 저장됩니다.',
      },
      {
        title: 'STEP 2 · 제품 추가',
        description: '제품 카탈로그에서 품목을 추가하고 수량·할인율을 입력합니다. 단가·원가는 시스템이 자동 계산합니다.',
      },
      {
        title: 'STEP 3 · 임시저장',
        description: '작성 중 「임시저장」으로 DRAFT 상태를 저장합니다. 브라우저를 닫기 전 한 번 저장해 두면 안전합니다.',
      },
      {
        title: 'STEP 4 · 내부 분석',
        description: '이익률·승인 필요 여부를 확인합니다. 정책을 초과하면 할인 사유 입력과 승인 요청이 필요합니다.',
      },
      {
        title: 'STEP 5 · 작성 완료',
        description: '「작성 완료」를 누르면 견적이 제출됩니다. 승인이 필요하면 승인 완료 후 PDF·이메일 발송이 가능합니다.',
      },
    ],
  },
  discount: {
    intro:
      '품목별 할인율은 적용 중인 할인 정책의 최대 할인율을 기준으로 판단합니다. 제품·카테고리마다 정책이 다를 수 있으므로 작성 화면의 정책 안내를 함께 확인하세요.',
    note: '정책 한도를 초과하는 할인은 사유 입력이 필수이며, 작성 완료 시 승인 요청 대상이 됩니다.',
    rows: [
      {
        label: '일반 품목 (예시)',
        maxDiscount: '10%',
        minProfit: '15%',
        action: '한도 초과 시 승인 요청',
      },
      {
        label: '고할인 품목 (예시)',
        maxDiscount: '8%',
        minProfit: '20%',
        action: '한도 초과 시 승인 요청',
      },
    ],
  },
  approval: {
    intro:
      '작성 완료 시 시스템이 할인율·이익률·견적 총액을 자동 검사합니다. 아래 조건 중 하나라도 해당하면 승인 요청이 필요합니다.',
    requiredTitle: '승인 요청이 필요한 경우',
    requiredItems: [
      '품목 할인율이 적용 정책의 최대 할인율을 초과한 경우',
      '견적 전체 이익률이 정책의 최소 이익률 미만인 경우',
      '견적 총액이 정책에 설정된 승인 기준 금액 이상인 경우',
      '할인 사유가 필요한 품목에 사유가 입력되지 않은 경우',
    ],
    immediateTitle: '승인 없이 진행 가능한 경우',
    immediateItems: [
      '모든 품목 할인율이 정책 한도 이내',
      '견적 이익률이 정책 최소 기준 이상',
      '총액이 승인 기준 금액 미만',
      '필수 할인 사유가 모두 입력됨',
    ],
  },
  example: {
    title: '모의 견적 시나리오',
    request:
      '(주)테크솔루션 김과장 — 사무용 의자 20개, 책상 10개 견적 요청. 예산 800만 원 내 희망. 의자는 10% 할인 희망.',
    lines: [
      '의자 20개 × 단가 150,000원, 할인율 10% → 정책 한도(10%) 이내',
      '책상 10개 × 단가 280,000원, 할인율 5%',
      '내부 분석 결과 이익률 18% → 정책 최소(15%) 이상',
      '총 견적금액 750만 원 → 승인 기준 금액(1,000만 원) 미만',
    ],
    outcome:
      '승인 요청 없이 「작성 완료」 가능. 승인 완료 후 PDF 다운로드·이메일 발송을 진행합니다. 만약 의자 할인을 15%로 올리면 할인 초과로 승인 요청이 필요합니다.',
  },
}

export const GUIDE_SECTIONS = [
  { id: 'procedure', title: '견적 작성 절차' },
  { id: 'discount', title: '할인율 적용 기준' },
  { id: 'approval', title: '승인 요청 조건' },
  { id: 'example', title: '견적 작성 예시' },
]

const mergeSection = (defaults, parsed) => ({ ...defaults, ...parsed })

/**
 * @param {string | GuideContentData | null | undefined} raw
 * @returns {GuideContentData}
 */
export function parseGuideContent(raw) {
  if (!raw) return structuredClone(DEFAULT_GUIDE_CONTENT)

  if (typeof raw === 'object') {
    return normalizeGuideObject(raw)
  }

  const trimmed = String(raw).trim()
  if (!trimmed) return structuredClone(DEFAULT_GUIDE_CONTENT)

  try {
    return normalizeGuideObject(JSON.parse(trimmed))
  } catch {
    return structuredClone(DEFAULT_GUIDE_CONTENT)
  }
}

/** @param {Partial<GuideContentData>} parsed */
function normalizeGuideObject(parsed) {
  const base = structuredClone(DEFAULT_GUIDE_CONTENT)
  return {
    procedure: mergeSection(base.procedure, parsed.procedure ?? {}),
    discount: mergeSection(base.discount, parsed.discount ?? {}),
    approval: mergeSection(base.approval, parsed.approval ?? {}),
    example: mergeSection(base.example, parsed.example ?? {}),
  }
}

/**
 * @param {GuideContentData} data
 * @returns {string}
 */
export function serializeGuideContent(data) {
  return JSON.stringify(data, null, 2)
}
