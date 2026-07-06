import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTrainingStatusContext } from '../../contexts/TrainingStatusContext'
import { useAuth } from '../../hooks/useAuth'
import TrainingVideoPlayer from '../../components/training/TrainingVideoPlayer'
import TrainingStatusBadge from '../../components/training/TrainingStatusBadge'
import TrainingGuideModal from '../../components/training/TrainingGuideModal'
import TrainingSummaryCards from '../../components/training/TrainingSummaryCards'
import { TRAINING_COMPLETE_THRESHOLD } from '../../constants/training'
import { TRAINING_TYPE_LABEL } from '../../constants/trainingCourses'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import './TrainingPage.css'

const MANAGER_COURSE_ORDER = ['QUOTE_WRITE', 'MANAGER_OPERATIONS']

const TrainingPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuth()
    const isManager = user?.role === 'SALES_MANAGER'
    const {
        trainingStatus,
        loading,
        saveVideoProgress,
        confirmGuide,
        canWriteQuote,
        canReviewApproval,
        canClickComplete,
        additionalTrainingRequired,
        requiredCourses,
        loadCourseContent,
    } = useTrainingStatusContext()

    const [pickedCourseType, setPickedCourseType] = useState(null)
    const [trainingContent, setTrainingContent] = useState(null)
    const [contentLoading, setContentLoading] = useState(false)
    const [guideOpen, setGuideOpen] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [durationSeconds, setDurationSeconds] = useState(0)
    const [pickedVideoId, setPickedVideoId] = useState(null)

    const displayCourses = useMemo(() => {
        if (!isManager) return requiredCourses
        const byType = new Map(requiredCourses.map((course) => [course.trainingType, course]))
        return MANAGER_COURSE_ORDER.map((type) => byType.get(type)).filter(Boolean)
    }, [isManager, requiredCourses])

    const defaultCourseType = displayCourses.find((course) => !course.completed)?.trainingType
        ?? displayCourses[0]?.trainingType
        ?? null

    const selectedCourseType = pickedCourseType != null
        && displayCourses.some((course) => course.trainingType === pickedCourseType)
        ? pickedCourseType
        : defaultCourseType

    useEffect(() => {
        if (!selectedCourseType) return undefined
        let cancelled = false
        queueMicrotask(() => {
            if (!cancelled) setContentLoading(true)
        })
        loadCourseContent(selectedCourseType)
            .then((content) => {
                if (!cancelled) setTrainingContent(content)
            })
            .catch(() => {
                if (!cancelled) setTrainingContent(null)
            })
            .finally(() => {
                if (!cancelled) setContentLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [selectedCourseType, loadCourseContent])

    const courseStatus = displayCourses.find((course) => course.trainingType === selectedCourseType) ?? null
    const statusVideos = courseStatus?.videos
    const contentVideos = trainingContent?.videos
    const sourceVideos = (statusVideos?.length ? statusVideos : contentVideos) ?? []
    const videos = [...sourceVideos].sort((a, b) => a.sortOrder - b.sortOrder)

    const selectedVideoId = pickedVideoId != null && videos.some((video) => video.id === pickedVideoId)
        ? pickedVideoId
        : (videos[0]?.id ?? null)

    const selectedVideo = videos.find((video) => video.id === selectedVideoId) ?? null

    const handleSaveProgress = (payload) => {
        if (!selectedVideoId || !selectedCourseType) return
        saveVideoProgress(selectedVideoId, payload, selectedCourseType).catch(() => { })
    }

    const handleManualVideoComplete = () => {
        if (!selectedVideoId || !selectedCourseType) return
        saveVideoProgress(selectedVideoId, {
            progressRate: 100,
            watchedSeconds: 300,
            lastWatchedSeconds: 300,
        }, selectedCourseType).catch(() => alert('진도 저장 실패'))
    }

    const handleConfirmGuide = async () => {
        if (!selectedCourseType) return
        setConfirming(true)
        try {
            await confirmGuide(selectedCourseType)
            setGuideOpen(false)
        } catch {
            // 에러 처리
        } finally {
            setConfirming(false)
        }
    }

    const handleCompleteAction = () => {
        if (isManager) {
            navigate('/admin/approval', { replace: true })
            return
        }
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

    const activeVideoCount = courseStatus?.activeVideoCount ?? videos.length
    const completedVideoCount = courseStatus?.completedVideoCount ?? 0
    const courseAdditionalTraining = Boolean(courseStatus?.additionalTrainingRequired)
    const courseGuideConfirmed = Boolean(courseStatus?.guideConfirmed)
    const courseCompleted = Boolean(courseStatus?.completed)
    const courseCanClickComplete = courseCompleted
        || (activeVideoCount > 0 && completedVideoCount === activeVideoCount && courseGuideConfirmed)

    const showStaffNotice = !isManager && !canWriteQuote && !additionalTrainingRequired
    const showManagerNotice = isManager && !canReviewApproval
    const primaryActionEnabled = isManager ? canReviewApproval && courseCanClickComplete : canClickComplete

    return (
        <div className="training-page">
            <PageHeader
                breadcrumbSep=">"
                breadcrumbs={['계정', '교육 이수']}
                title="교육 이수"
            />

            <div className="training-page__shell">
                <div className="training-page__main">
                <div className="training-intro">
                    <div className="training-intro__badges">
                        {trainingContent?.required && (
                            <span className="training-header__required">필수</span>
                        )}
                        {(additionalTrainingRequired || courseAdditionalTraining) && (
                            <span className="training-header__required training-header__required--alert">추가 교육</span>
                        )}
                        <TrainingStatusBadge status={courseStatus?.status ?? trainingStatus?.status} />
                    </div>

                    {displayCourses.length > 1 && (
                        <div className="training-course-tabs" role="tablist" aria-label="필수 교육 코스">
                            {displayCourses.map((course) => (
                                <button
                                    key={course.trainingType}
                                    type="button"
                                    role="tab"
                                    aria-selected={selectedCourseType === course.trainingType}
                                    className={[
                                        'training-course-tab',
                                        selectedCourseType === course.trainingType ? 'training-course-tab--active' : '',
                                        course.completed ? 'training-course-tab--done' : '',
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => {
                                        setPickedCourseType(course.trainingType)
                                        setPickedVideoId(null)
                                    }}
                                >
                                    <span>{TRAINING_TYPE_LABEL[course.trainingType] ?? course.trainingType}</span>
                                    {course.completed && <span className="training-course-tab__badge">완료</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    <p className="training-intro__desc">
                        {trainingContent?.description || (isManager
                            ? '승인 검토를 위해 필수 교육 영상을 모두 시청하고 가이드 확인을 완료해 주세요.'
                            : '견적 작성 기능을 사용하려면 활성화된 교육 영상을 모두 시청하고 가이드 확인을 완료해 주세요.')}
                    </p>

                    {(additionalTrainingRequired || courseAdditionalTraining) && (
                        <div className="training-notice training-notice--alert">
                            <p className="training-notice__title">추가 교육이 필요합니다</p>
                            <p className="training-notice__body">
                                새로운 필수 교육 영상이 추가되었습니다. ({completedVideoCount}/{activeVideoCount} 완료)
                                {isManager
                                    ? ' 추가 영상을 이수하기 전까지 승인 처리가 제한됩니다.'
                                    : ' 추가 영상을 이수하기 전까지 견적 작성이 제한됩니다.'}
                            </p>
                        </div>
                    )}

                    {showStaffNotice && (
                        <div className="training-notice">
                            <p className="training-notice__title">교육 이수 필요</p>
                            <p className="training-notice__body">
                                활성 교육 영상 {activeVideoCount}개를 모두 {TRAINING_COMPLETE_THRESHOLD}% 이상 시청하고 가이드 확인을 완료해야 합니다.
                            </p>
                        </div>
                    )}

                    {showManagerNotice && (
                        <div className="training-notice">
                            <p className="training-notice__title">관리자 교육 이수 필요</p>
                            <p className="training-notice__body">
                                승인·반려 처리를 위해 필수 교육을 모두 이수해야 합니다.
                            </p>
                        </div>
                    )}
                </div>

                <div className="training-card training-video-panel">
                    <div className="training-video-panel__hero">
                        <div>
                            <p className="training-video-panel__eyebrow">STEP 1 · 교육 영상</p>
                            <h2 className="training-video-panel__title">
                                {selectedVideo?.title || trainingContent?.title || '교육 영상'}
                            </h2>
                            <p className="training-video-panel__sub">
                                {completedVideoCount}/{activeVideoCount}개 영상 완료 · 최소 시청률 {TRAINING_COMPLETE_THRESHOLD}%
                            </p>
                        </div>
                        <div className="training-video-panel__badge" aria-hidden="true">
                            <span className="training-video-panel__badge-value">
                                {activeVideoCount > 0
                                    ? Math.round((completedVideoCount / activeVideoCount) * 100)
                                    : 0}%
                            </span>
                            <span className="training-video-panel__badge-label">진행</span>
                        </div>
                    </div>

                    {contentLoading ? (
                        <div className="training-video-empty">교육 콘텐츠를 불러오는 중...</div>
                    ) : videos.length === 0 ? (
                        <div className="training-video-empty">
                            등록된 활성 교육 영상이 없습니다. 관리자에게 문의해 주세요.
                        </div>
                    ) : (
                        <div className={videos.length > 1 ? 'training-video-layout' : 'training-video-layout training-video-layout--single'}>
                            {videos.length > 1 && (
                                <div className="training-video-picker" role="tablist" aria-label="교육 영상 목록">
                                    <p className="training-video-picker__label">영상 목록</p>
                                    {videos.map((video, index) => {
                                        const done = Number(video.progressRate ?? 0) >= TRAINING_COMPLETE_THRESHOLD
                                        const isActive = selectedVideoId === video.id
                                        const rate = Number(video.progressRate ?? 0)
                                        return (
                                            <button
                                                key={video.id}
                                                type="button"
                                                role="tab"
                                                aria-selected={isActive}
                                                className={[
                                                    'training-video-picker__item',
                                                    isActive ? 'training-video-picker__item--active' : '',
                                                    done ? 'training-video-picker__item--done' : '',
                                                ].filter(Boolean).join(' ')}
                                                onClick={() => setPickedVideoId(video.id)}
                                            >
                                                <span className="training-video-picker__index">{index + 1}</span>
                                                <span className="training-video-picker__text">
                                                    <span className="training-video-picker__name">
                                                        {video.title || `영상 ${index + 1}`}
                                                    </span>
                                                    <span className="training-video-picker__rate">
                                                        시청률 {rate.toFixed(0)}%
                                                    </span>
                                                </span>
                                                {done && <span className="training-video-picker__badge">완료</span>}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            <div className="training-video-player-wrap">
                                <TrainingVideoPlayer
                                    key={selectedVideo?.id ?? 'empty'}
                                    videoUrl={selectedVideo?.videoUrl}
                                    initialStatus={selectedVideo}
                                    onSaveProgress={handleSaveProgress}
                                    onDurationChange={setDurationSeconds}
                                    onManualComplete={handleManualVideoComplete}
                                    manualCompleteDone={Number(selectedVideo?.progressRate ?? 0) >= TRAINING_COMPLETE_THRESHOLD}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="training-card training-guide-panel">
                    <div className="training-guide-panel__head">
                        <p className="training-guide-panel__eyebrow">STEP 2 · 가이드</p>
                        <p className="training-guide-card__info-title">교육 가이드 확인</p>
                        <p className="training-guide-card__info-sub">
                            {isManager && selectedCourseType === 'MANAGER_OPERATIONS'
                                ? '승인 검토 절차, 부서 운영 정책 등을 확인하세요.'
                                : '견적 작성 절차, 할인율 기준, 승인 요청 조건 등을 확인하세요.'}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant={courseGuideConfirmed ? 'success' : 'outline'}
                        size="sm"
                        onClick={() => setGuideOpen(true)}
                    >
                        {courseGuideConfirmed ? '✓ 가이드 확인 완료' : '가이드 확인하기'}
                    </Button>
                </div>

                <div className="training-actions">
                    <Button
                        type="button"
                        variant="primary"
                        size="md"
                        disabled={!primaryActionEnabled}
                        onClick={handleCompleteAction}
                    >
                        {isManager
                            ? (canReviewApproval ? '승인 검토 화면으로 이동' : '교육 이수 후 승인 검토 가능')
                            : (canWriteQuote ? '견적 작성 화면으로 이동' : '이수 완료 처리하기')}
                    </Button>
                </div>
                </div>

                <aside className="training-page__aside">
                    <div className="training-summary">
                        <TrainingSummaryCards
                            status={courseStatus ?? trainingStatus}
                            durationSeconds={durationSeconds}
                            activeVideoCount={activeVideoCount}
                            completedVideoCount={completedVideoCount}
                        />
                    </div>

                    <div className="training-steps">
                        <p className="training-steps__title">이수 체크리스트</p>
                        <ol className="training-steps__list">
                            <li className={completedVideoCount === activeVideoCount && activeVideoCount > 0 ? 'training-steps__item--done' : ''}>
                                <span className="training-steps__num">1</span>
                                <span className="training-steps__text">
                                    교육 영상 시청
                                    <small>{completedVideoCount}/{activeVideoCount} 완료</small>
                                </span>
                            </li>
                            <li className={courseGuideConfirmed ? 'training-steps__item--done' : ''}>
                                <span className="training-steps__num">2</span>
                                <span className="training-steps__text">
                                    가이드 확인
                                    <small>{courseGuideConfirmed ? '확인 완료' : '미확인'}</small>
                                </span>
                            </li>
                            <li className={primaryActionEnabled ? 'training-steps__item--done' : ''}>
                                <span className="training-steps__num">3</span>
                                <span className="training-steps__text">
                                    이수 완료
                                    <small>{courseCompleted ? '완료' : '진행 중'}</small>
                                </span>
                            </li>
                        </ol>
                    </div>
                </aside>
            </div>

            {guideOpen && (
                <TrainingGuideModal
                    guideContent={trainingContent?.guideContent}
                    alreadyConfirmed={courseGuideConfirmed}
                    confirming={confirming}
                    onConfirm={handleConfirmGuide}
                    onClose={() => setGuideOpen(false)}
                />
            )}
        </div>
    )
}

export default TrainingPage
