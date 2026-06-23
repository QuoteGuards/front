import { useTrainingStatus } from '../../hooks/useTrainingStatus'
import QuoteAccessRestricted from '../../components/quote/QuoteAccessRestricted'

const QuoteWritePage = () => {
    const { loading, canWriteQuote, trainingStatus } = useTrainingStatus()

    if (loading && !trainingStatus) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
                <p className="text-gray-400 text-sm">접근 권한을 확인하는 중...</p>
            </div>
        )
    }

    if (!canWriteQuote) {
        return <QuoteAccessRestricted reason="TRAINING_NOT_COMPLETED" />
    }

    return (
        <div className="flex-1 bg-gray-50 min-h-screen">
            <div className="px-8 pt-8 pb-5 border-b border-gray-200 bg-white flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-800">견적 작성</h1>
                <button className="text-sm text-violet-600 hover:underline">견적 작성 가이드 확인</button>
            </div>
            <div className="px-8 py-10 text-gray-400 text-sm">
                견적 작성 폼 (고객 정보 / 제품 선택 / 금액 자동 계산 — 구현 예정)
            </div>
        </div>
    )
}

export default QuoteWritePage
