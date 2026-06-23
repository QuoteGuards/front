import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTrainingStatus } from '../../hooks/useTrainingStatus'
import TrainingVideoPlayer from '../../components/training/TrainingVideoPlayer'
import TrainingStatusBadge from '../../components/training/TrainingStatusBadge'
import TrainingGuideModal from '../../components/training/TrainingGuideModal'
import TrainingSummaryCards from '../../components/training/TrainingSummaryCards'
import { TRAINING_COMPLETE_THRESHOLD } from '../../constants/training'

const TrainingPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const {
        trainingStatus,
        trainingContent,
        loading,
        actionLoading,
        saveProgress,
        confirmGuide,
        canWriteQuote,
        canClickComplete,
    } = useTrainingStatus({ loadContent: true })

    const [guideOpen, setGuideOpen] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [durationSeconds, setDurationSeconds] = useState(0)

    const handleSaveProgress = (payload) => {
        saveProgress(payload).catch(() => { })
    }

    const handleConfirmGuide = async () => {
        setConfirming(true)
        try {
            await confirmGuide()
            setGuideOpen(false)
        } catch {
            // 실패 시 모달 유지, 별도 에러 처리는 토스트 등으로 확장 가능
        } finally {
            setConfirming(false)
        }
    }

    const handleGoToQuoteWrite = () => {
        const redirectTo = location.state?.from?.pathname ?? '/quotes/new'
        navigate(redirectTo, { replace: true })
    }

    if (loading && !trainingStatus) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
                <p className="text-gray-400 text-sm">교육 정보를 불러오는 중...</p>
            </div>
        )
    }

    return (
        <div className="flex-1 bg-gray-50 min-h-screen">
            <div className="px-8 pt-8 pb-6 border-b border-gray-200 bg-white">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-xl font-bold text-gray-800">
                                {trainingContent?.title || '견적 작성 교육 이수'}
                            </h1>
                            {trainingContent?.required && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">
                                    필수
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-400">
                            {trainingContent?.description || '견적 작성 기능을 사용하려면 아래 교육 영상을 시청하고 이수 완료 처리를 해주세요.'}
                        </p>
                    </div>
                    <TrainingStatusBadge status={trainingStatus?.status} />
                </div>

                {!canWriteQuote && (
                    <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                        <p className="font-semibold">교육 이수 필요</p>
                        <p className="text-amber-700 mt-0.5">
                            견적 작성 기능을 사용하려면 영상 시청률 {TRAINING_COMPLETE_THRESHOLD}% 이상과 가이드 확인을 모두 완료해야 합니다.
                        </p>
                    </div>
                )}

                <div className="mt-5">
                    <TrainingSummaryCards status={trainingStatus} durationSeconds={durationSeconds} />
                </div>
            </div>

            <div className="px-8 py-6 max-w-4xl">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">📹 견적 작성 가이드 영상</h2>
                    <TrainingVideoPlayer
                        videoUrl={trainingContent?.videoUrl}
                        initialStatus={trainingStatus}
                        onSaveProgress={handleSaveProgress}
                        onDurationChange={setDurationSeconds}
                    />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mt-5 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        <p className="font-semibold text-gray-700 mb-1">견적 작성 가이드 확인</p>
                        <p className="text-gray-400 text-xs">
                            견적 작성 절차, 할인율 적용 기준, 승인 요청 조건, 작성 예시를 확인하세요.
                        </p>
                    </div>
                    <button
                        onClick={() => setGuideOpen(true)}
                        className="px-4 py-2 text-sm rounded-lg border border-violet-300 text-violet-700 hover:bg-violet-50 transition-colors shrink-0"
                    >
                        {trainingStatus?.guideConfirmed ? '✓ 가이드 다시 보기' : '견적 작성 가이드 확인하기'}
                    </button>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                    {canWriteQuote ? (
                        <button
                            onClick={handleGoToQuoteWrite}
                            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                        >
                            견적 작성 화면으로 이동하기 →
                        </button>
                    ) : (
                        <button
                            disabled={!canClickComplete || actionLoading}
                            onClick={handleGoToQuoteWrite}
                            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            ✓ 이수 완료
                        </button>
                    )}
                </div>

                {!canClickComplete && !canWriteQuote && (
                    <p className="text-right text-xs text-gray-400 mt-2">
                        영상 시청률 {TRAINING_COMPLETE_THRESHOLD}% 이상과 가이드 확인을 모두 완료해야 이수 완료 버튼이 활성화됩니다.
                    </p>
                )}
            </div>

            {guideOpen && (
                <TrainingGuideModal
                    guideContent={trainingContent?.guideContent}
                    alreadyConfirmed={!!trainingStatus?.guideConfirmed}
                    confirming={confirming}
                    onConfirm={handleConfirmGuide}
                    onClose={() => setGuideOpen(false)}
                />
            )}
        </div>
    )
}

export default TrainingPage
