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
        saveVideoProgress,
        confirmGuide,
        canWriteQuote,
        canClickComplete,
        additionalTrainingRequired,
    } = useTrainingStatusContext()

    const [guideOpen, setGuideOpen] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [durationSeconds, setDurationSeconds] = useState(0)
    const [pickedVideoId, setPickedVideoId] = useState(null)

    const statusVideos = trainingStatus?.videos
    const contentVideos = trainingContent?.videos
    const sourceVideos = statusVideos?.length ? statusVideos : (contentVideos ?? [])
    const videos = [...sourceVideos].sort((a, b) => a.sortOrder - b.sortOrder)

    const selectedVideoId = pickedVideoId != null && videos.some((video) => video.id === pickedVideoId)
        ? pickedVideoId
        : (videos[0]?.id ?? null)

    const selectedVideo = videos.find((video) => video.id === selectedVideoId) ?? null

    const handleSaveProgress = (payload) => {
        if (!selectedVideoId) return
        saveVideoProgress(selectedVideoId, payload).catch(() => { })
    }

    const handleManualVideoComplete = () => {
        if (!selectedVideoId) return
        saveVideoProgress(selectedVideoId, {
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

    const activeVideoCount = trainingStatus?.activeVideoCount ?? videos.length
    const completedVideoCount = trainingStatus?.completedVideoCount ?? 0

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
                        {additionalTrainingRequired && (
                            <span className="training-header__required training-header__required--alert">추가 교육</span>
                        )}
                        <TrainingStatusBadge status={trainingStatus?.status} />
                    </div>
                }
            />

            <div className="training-header" style={{ borderTop: 'none' }}>
                <p className="training-header__desc">
                    {trainingContent?.description || '견적 작성 기능을 사용하려면 활성화된 교육 영상을 모두 시청하고 가이드 확인을 완료해 주세요.'}
                </p>

                {additionalTrainingRequired && (
                    <div className="training-notice training-notice--alert">
                        <p className="training-notice__title">추가 교육이 필요합니다</p>
                        <p className="training-notice__body">
                            새로운 필수 교육 영상이 추가되었습니다. ({completedVideoCount}/{activeVideoCount} 완료)
                            추가 영상을 이수하기 전까지 견적 작성이 제한됩니다.
                        </p>
                    </div>
                )}

                {!canWriteQuote && !additionalTrainingRequired && (
                    <div className="training-notice">
                        <p className="training-notice__title">교육 이수 필요</p>
                        <p className="training-notice__body">
                            활성 교육 영상 {activeVideoCount}개를 모두 {TRAINING_COMPLETE_THRESHOLD}% 이상 시청하고 가이드 확인을 완료해야 합니다.
                        </p>
                    </div>
                )}

                <div className="training-summary">
                    <TrainingSummaryCards
                        status={trainingStatus}
                        durationSeconds={durationSeconds}
                        activeVideoCount={activeVideoCount}
                        completedVideoCount={completedVideoCount}
                    />
                </div>
            </div>

            <div className="training-content">
                <div className="training-card">
                    <div className="training-video-card__header">
                        <span className="training-video-card__label">
                            교육 영상 ({completedVideoCount}/{activeVideoCount} 완료)
                        </span>
                    </div>

                    {videos.length === 0 ? (
                        <div className="training-video-empty">
                            등록된 활성 교육 영상이 없습니다. 관리자에게 문의해 주세요.
                        </div>
                    ) : (
                        <>
                            {videos.length > 1 && (
                                <div className="training-video-tabs" role="tablist" aria-label="교육 영상 목록">
                                    {videos.map((video, index) => {
                                        const done = Number(video.progressRate ?? 0) >= TRAINING_COMPLETE_THRESHOLD
                                        return (
                                            <button
                                                key={video.id}
                                                type="button"
                                                role="tab"
                                                aria-selected={selectedVideoId === video.id}
                                                className={[
                                                    'training-video-tab',
                                                    selectedVideoId === video.id ? 'training-video-tab--active' : '',
                                                    done ? 'training-video-tab--done' : '',
                                                ].filter(Boolean).join(' ')}
                                                onClick={() => setPickedVideoId(video.id)}
                                            >
                                                <span>{video.title || `영상 ${index + 1}`}</span>
                                                {done && <span className="training-video-tab__badge">완료</span>}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            <div className="training-video-card__header" style={{ marginTop: '12px' }}>
                                <span className="training-video-card__subtitle">
                                    {selectedVideo?.title || '교육 영상'}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleManualVideoComplete}
                                    className={[
                                        'training-video-complete-btn',
                                        Number(selectedVideo?.progressRate ?? 0) >= 100 ? 'training-video-complete-btn--done' : '',
                                    ].filter(Boolean).join(' ')}
                                >
                                    {Number(selectedVideo?.progressRate ?? 0) >= 100 ? '✓ 영상 시청 완료' : '영상 시청 완료 처리'}
                                </button>
                            </div>

                            <TrainingVideoPlayer
                                key={selectedVideo?.id ?? 'empty'}
                                videoUrl={selectedVideo?.videoUrl}
                                initialStatus={selectedVideo}
                                onSaveProgress={handleSaveProgress}
                                onDurationChange={setDurationSeconds}
                            />
                        </>
                    )}
                </div>

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
