import { useNavigate } from 'react-router-dom'

const REASONS = {
  TRAINING_NOT_COMPLETED: {
    icon: '🔒',
    title: '견적 작성 기능 이용 제한',
    description: ['견적 작성 기능을 사용하려면 먼저 견적 작성 교육 영상을 이수해야 합니다.'],
    steps: [
      '교육 이수 화면으로 이동',
      '견적 작성 가이드 영상 시청',
      '이수 완료 버튼 클릭',
      '견적 작성 기능 활성화',
    ],
    primaryLabel: '교육 이수 화면으로 이동',
    primaryTo: '/training',
  },
  TRAINING_APPROVAL_NOT_COMPLETED: {
    icon: '🔒',
    title: '승인 검토 기능 이용 제한',
    description: ['승인·반려 처리를 하려면 필수 교육을 먼저 이수해야 합니다.'],
    steps: [
      '교육 이수 화면으로 이동',
      '필수 교육 영상 시청 및 가이드 확인',
      '이수 완료 후 승인 검토 메뉴 이용',
    ],
    primaryLabel: '교육 이수 화면으로 이동',
    primaryTo: '/training',
  },
  ACCESS_DENIED: {
    icon: '⛔',
    title: '접근 권한이 없습니다',
    description: ['이 페이지는 해당 역할의 사용자만 접근할 수 있습니다.'],
    primaryLabel: '메인 화면으로',
    primaryTo: null,
  },
  LOGIN_REQUIRED: {
    icon: '👤',
    title: '로그인이 필요합니다',
    description: ['이 화면을 보려면 먼저 로그인해야 합니다.'],
    primaryLabel: '로그인 화면으로 이동',
    primaryTo: '/login',
  },
  SUSPENDED: {
    icon: '🚫',
    title: '정지된 계정입니다',
    description: ['관리자에 의해 계정 이용이 정지되었습니다. 문의가 필요하면 관리자에게 연락해주세요.'],
    primaryLabel: '로그인 화면으로 이동',
    primaryTo: '/login',
  },
}

const QuoteAccessRestricted = ({ reason = 'TRAINING_NOT_COMPLETED', redirectTo }) => {
  const navigate = useNavigate()
  const info = REASONS[reason] ?? REASONS.TRAINING_NOT_COMPLETED
  const primaryTo = redirectTo ?? info.primaryTo ?? '/'

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: 'clamp(32px, 6vh, 80px) 0' }}>
      <div style={{
        background: 'var(--color-bg-white)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        width: 'clamp(480px, 85vw, 1020px)',
        padding: 'clamp(48px, 6vw, 88px) clamp(48px, 7vw, 96px)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '72px', height: '72px', margin: '0 auto 24px',
          borderRadius: '50%', background: '#FEF2F2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '34px',
        }}>
          {info.icon}
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>{info.title}</h2>
        <div style={{ fontSize: '15px', color: 'var(--color-text-sub)', marginTop: '12px' }}>
          {info.description.map((line) => <p key={line} style={{ margin: '4px 0' }}>{line}</p>)}
        </div>

        {info.steps && (
          <div style={{
            marginTop: '28px', background: 'var(--color-bg-main)',
            borderRadius: 'var(--radius-sm)', padding: '20px 24px',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'left',
          }}>
            {info.steps.map((step, idx) => (
              <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  background: 'var(--color-primary)', color: '#fff',
                  fontSize: '13px', fontWeight: 700, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {idx + 1}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-sub)', lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => navigate(primaryTo)}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-primary)', color: '#fff',
              fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer',
            }}
          >
            {info.primaryLabel}
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)', background: 'transparent',
                color: 'var(--color-text-sub)', fontSize: '14px', cursor: 'pointer',
              }}
            >
              이전 페이지
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)', background: 'transparent',
                color: 'var(--color-text-sub)', fontSize: '14px', cursor: 'pointer',
              }}
            >
              메인 화면
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuoteAccessRestricted
