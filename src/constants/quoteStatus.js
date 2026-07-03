// 백엔드 QuoteStatus enum 기준 공통 한글 라벨/배지 색상 매핑

export const QUOTE_STATUS_LABEL = {
    DRAFT: '작성중',
    REVISING: '수정중',
    SUBMITTED: '제출완료',
    APPROVAL_NOT_REQUIRED: '승인불필요',
    APPROVAL_PENDING: '승인대기',
    APPROVED: '승인완료',
    REJECTED: '반려',
    SENT: '발송완료',
    EXPIRED: '만료',
    CANCELLED: '취소',
}

export const QUOTE_STATUS_STYLE = {
    DRAFT: 'bg-gray-100 text-gray-600',
    REVISING: 'bg-amber-100 text-amber-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    APPROVAL_NOT_REQUIRED: 'bg-emerald-100 text-emerald-700',
    APPROVAL_PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-600',
    SENT: 'bg-violet-100 text-violet-700',
    EXPIRED: 'bg-gray-100 text-gray-400',
    CANCELLED: 'bg-gray-100 text-gray-400',
}

// 취소 가능한 상태 (SENT/EXPIRED/CANCELLED는 취소 불가 - 백엔드 Quote.cancel() 정책과 동일)
export const QUOTE_CANCELLABLE_STATUSES = [
    'DRAFT', 'SUBMITTED', 'APPROVAL_NOT_REQUIRED', 'APPROVAL_PENDING',
    'APPROVED', 'REJECTED', 'REVISING',
]

// 목록 화면 필터 버튼용 - 한글 라벨이 실제로 포함하는 enum 상태들
export const QUOTE_STATUS_FILTERS = {
    '전체': null,
    '작성중': ['DRAFT', 'REVISING'],
    '제출완료': ['SUBMITTED'],
    '승인불필요': ['APPROVAL_NOT_REQUIRED'],
    '승인대기': ['APPROVAL_PENDING'],
    '발송완료': ['SENT'],
    '승인완료': ['APPROVED'],
    '반려': ['REJECTED'],
    '만료': ['EXPIRED'],
}