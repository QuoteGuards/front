import './StatusBadge.css'

// 견적 상태
const QUOTE_STATUS = {
  DRAFT:                 { label: '임시저장',   color: 'gray'   },
  REVISING:              { label: '수정 중',    color: 'purple' },
  SUBMITTED:             { label: '제출됨',     color: 'blue'   },
  APPROVAL_NOT_REQUIRED: { label: '승인불필요', color: 'green'  },
  APPROVAL_PENDING:      { label: '승인 대기',  color: 'orange' },
  APPROVED:              { label: '승인 완료',  color: 'green'  },
  REJECTED:              { label: '반려',       color: 'red'    },
  SENT:                  { label: '발송 완료',  color: 'blue'   },
  EXPIRED:               { label: '만료',       color: 'gray'   },
  CANCELLED:             { label: '취소',       color: 'gray'   },
}

// 승인 요청 상태
const APPROVAL_STATUS = {
  PENDING:   { label: '대기', color: 'orange' },
  APPROVED:  { label: '승인', color: 'green'  },
  REJECTED:  { label: '반려', color: 'red'    },
  CANCELLED: { label: '취소', color: 'gray'   },
}

// 사용자 상태
const USER_STATUS = {
  ACTIVE:    { label: '활성',   color: 'green'  },
  SUSPENDED: { label: '정지',   color: 'orange' },
  DELETED:   { label: '삭제됨', color: 'gray'   },
}

const ALL_STATUS = { ...QUOTE_STATUS, ...APPROVAL_STATUS, ...USER_STATUS }

/**
 * @param {string} status - 상태값 (DRAFT, APPROVED 등)
 * @param {string} [type] - 'quote' | 'approval' | 'user' | undefined (자동 감지)
 */
const StatusBadge = ({ status, type }) => {
  let config

  if (type === 'quote') config = QUOTE_STATUS[status]
  else if (type === 'approval') config = APPROVAL_STATUS[status]
  else if (type === 'user') config = USER_STATUS[status]
  else config = ALL_STATUS[status]

  const label = config?.label ?? status
  const color = config?.color ?? 'gray'

  return (
    <span className={`status-badge status-badge--${color}`} aria-label={label}>
      {label}
    </span>
  )
}

export default StatusBadge
