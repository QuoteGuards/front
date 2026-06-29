import { useNavigate } from 'react-router-dom'

const REASONS = {
    TRAINING_NOT_COMPLETED: {
        icon: '🔒',
        title: '견적 작성 기능 이용 제한',
        description: ['견적 작성 기능을 사용하려면', '먼저 견적 작성 교육 영상을 이수해야 합니다.'],
        steps: [
            '교육 이수 화면으로 이동',
            '견적 작성 가이드 영상 시청',
            '이수 완료 버튼 클릭',
            '견적 작성 기능 활성화',
        ],
        primaryLabel: '교육 이수 화면으로 이동하기',
        primaryTo: '/training',
    },
    ACCESS_DENIED: {
        icon: '⛔',
        title: '접근 권한이 없습니다',
        description: ['이 페이지는 해당 역할의 사용자만 접근할 수 있습니다.'],
        primaryLabel: '메인 화면으로',
        primaryTo: null, // redirectTo prop으로 대체
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
        description: ['관리자에 의해 계정 이용이 정지되었습니다.', '문의가 필요하면 관리자에게 연락해주세요.'],
        primaryLabel: '로그인 화면으로 이동',
        primaryTo: '/login',
    },
}

const QuoteAccessRestricted = ({ reason = 'TRAINING_NOT_COMPLETED', redirectTo }) => {
    const navigate = useNavigate()
    const info = REASONS[reason] ?? REASONS.TRAINING_NOT_COMPLETED
    const primaryTo = redirectTo ?? info.primaryTo ?? '/'

    return (
        <div className="flex items-center justify-center py-12">
            <div className="bg-white border border-rose-200 rounded-2xl shadow-sm w-full max-w-3xl p-16 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-3xl mb-4">
                    {info.icon}
                </div>
                <h2 className="text-lg font-bold text-gray-800">{info.title}</h2>
                <div className="text-sm text-gray-500 mt-2 space-y-0.5">
                    {info.description.map((line) => (
                        <p key={line}>{line}</p>
                    ))}
                </div>

                {info.steps && (
                    <div className="mt-5 bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-left">
                        {info.steps.map((step, idx) => (
                            <div key={step} className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                </span>
                                <span className="text-xs text-gray-600 leading-snug">{step}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-6 flex flex-col gap-2">
                    <button
                        onClick={() => navigate(primaryTo)}
                        className="w-full py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                    >
                        {info.primaryLabel}
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                        >
                            이전 페이지
                        </button>
                        <button
                            onClick={() => navigate(primaryTo)}
                            className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
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
