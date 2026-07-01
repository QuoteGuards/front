import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTrainingStatusContext } from '../../contexts/TrainingStatusContext'
import TrainingVideoPlayer from '../../components/training/TrainingVideoPlayer'
import TrainingStatusBadge from '../../components/training/TrainingStatusBadge'
import TrainingGuideModal from '../../components/training/TrainingGuideModal'
import TrainingSummaryCards from '../../components/training/TrainingSummaryCards'
import { TRAINING_COMPLETE_THRESHOLD } from '../../constants/training'
import PageHeader from '../../components/common/PageHeader'
import './TrainingPage.css'

const TrainingPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const {
        trainingStatus,
        trainingContent,
        loading,
        saveProgress,
        confirmGuide,
        canWriteQuote,
        canClickComplete,
    } = useTrainingStatusContext()

    const [guideOpen, setGuideOpen] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [durationSeconds, setDurationSeconds] = useState(0)

    const handleSaveProgress = (payload) => {
        saveProgress(payload).catch(() => { })
    }

    const handleManualVideoComplete = () => {
        saveProgress({
            progressRate: 100,
            watchedSeconds: 300,
            lastWatchedSeconds: 300,
        }).catch(() => alert('진도 저장 실패'))
    }

    const handleConfirmGuide = async () => {
        setConfirming(true)
        try {
            await confirmGuide()
            setGuideOpen(false)
        } catch {
            // 에러 처리
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
            <div className="training-loading">
                <p className="training-loading__text">교육 정보를 불러오는 중...</p>
            </div>
        )
    }

    return (
        <div>
            <PageHeader
                breadcrumbs={['계정', '교육 이수']}
                title={trainingContent?.title || '견적 작성 교육 이수'}
                actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {trainingContent?.required && (
                            <span className="training-header__required">필수</span>
                        )}
                        <TrainingStatusBadge status={trainingStatus?.status} />
                    </div>
                }
            />

            {/* 상세 정보 섹션 */}
            <div className="training-header" style={{ borderTop: 'none' }}>
                <p className="training-header__desc">
                    {trainingContent?.description || '견적 작성 기능을 사용하려면 아래 교육 영상을 시청하고 이수 완료 처리를 해주세요.'}
                </p>

                {!canWriteQuote && (
                    <div className="training-notice">
                        <p className="training-notice__title">교육 이수 필요</p>
                        <p className="training-notice__body">
                            견적 작성 기능을 사용하려면 영상 시청률 {TRAINING_COMPLETE_THRESHOLD}% 이상과 가이드 확인을 모두 완료해야 합니다.
                        </p>
                    </div>
                )}

                <div className="training-summary">
                    <TrainingSummaryCards status={trainingStatus} durationSeconds={durationSeconds} />
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="training-content">
                {/* 영상 카드 */}
                <div className="training-card">
                    <div className="training-video-card__header">
                        <span className="training-video-card__label">견적 작성 가이드 영상</span>
                        <button
                            type="button"
                            onClick={handleManualVideoComplete}
                            className={[
                                'training-video-complete-btn',
                                trainingStatus?.progressRate >= 100 ? 'training-video-complete-btn--done' : '',
                            ].filter(Boolean).join(' ')}
                        >
                            {trainingStatus?.progressRate >= 100 ? '✓ 영상 시청 완료' : '영상 시청 완료 처리'}
                        </button>
                    </div>
                    <TrainingVideoPlayer
                        videoUrl={trainingContent?.videoUrl}
                        initialStatus={trainingStatus}
                        onSaveProgress={handleSaveProgress}
                        onDurationChange={setDurationSeconds}
                    />
                </div>

                {/* 가이드 확인 카드 */}
                <div className="training-card">
                    <div className="training-guide-card">
                        <div>
                            <p className="training-guide-card__info-title">견적 작성 가이드 확인</p>
                            <p className="training-guide-card__info-sub">견적 작성 절차, 할인율 기준, 승인 요청 조건 등을 확인하세요.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setGuideOpen(true)}
                            className={[
                                'training-guide-btn',
                                trainingStatus?.guideConfirmed ? 'training-guide-btn--done' : '',
                            ].filter(Boolean).join(' ')}
                        >
                            {trainingStatus?.guideConfirmed ? '✓ 가이드 확인 완료' : '견적 작성 가이드 확인하기'}
                        </button>
                    </div>
                </div>

                {/* 이수 완료 버튼 */}
                <div className="training-actions">
                    <button
                        type="button"
                        disabled={!canClickComplete}
                        onClick={handleGoToQuoteWrite}
                        className="training-complete-btn"
                    >
                        {canWriteQuote ? '견적 작성 화면으로 이동하기 →' : '이수 완료 처리하기'}
                    </button>
                </div>
            </div>

            {/* 가이드 모달 */}
            {guideOpen && (
                <TrainingGuideModal
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
