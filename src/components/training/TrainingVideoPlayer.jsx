import { useEffect, useRef, useState, useCallback } from 'react'
import { TRAINING_COMPLETE_THRESHOLD } from '../../constants/training'
import Button from '../common/Button'

const SAVE_INTERVAL_MS = 7000
// 정상 재생 시 timeupdate 간 currentTime 증가폭(≈0.25s, 배속 시 커짐)의 상한.
// 이보다 크게 튀면 재생바 스킵(seek)으로 간주해 시청 시간에 반영하지 않는다. (네이티브 2배속까지 여유)
const MAX_PLAYBACK_STEP_SEC = 2.0

const formatTime = (sec) => {
    const s = Math.max(0, Math.floor(sec || 0))
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

const TrainingVideoPlayer = ({
    videoUrl,
    initialStatus,
    onSaveProgress,
    onDurationChange,
    onManualComplete,
    manualCompleteLabel = '영상 시청 완료 처리',
    manualCompleteDone = false,
}) => {
    const videoRef = useRef(null)
    const watchedSecondsRef = useRef(initialStatus?.watchedSeconds ?? 0) // 실제 재생으로 흐른 누적 시청 시간(초)
    const lastTimeRef = useRef(initialStatus?.lastWatchedSeconds ?? 0)   // 직전 timeupdate의 currentTime (delta 계산용)
    const lastSavedRef = useRef(0)
    const lastPayloadRef = useRef('')
    const resumedRef = useRef(false)
    const onSaveProgressRef = useRef(onSaveProgress)
    const initialProgressRateRef = useRef(Number(initialStatus?.progressRate ?? 0))
    const onDurationChangeRef = useRef(onDurationChange)

    useEffect(() => {
        onSaveProgressRef.current = onSaveProgress
    }, [onSaveProgress])

    useEffect(() => {
        initialProgressRateRef.current = Number(initialStatus?.progressRate ?? 0)
        if (initialStatus?.watchedSeconds != null) {
            watchedSecondsRef.current = Math.max(watchedSecondsRef.current, initialStatus.watchedSeconds)
        }
    }, [initialStatus?.progressRate, initialStatus?.watchedSeconds])

    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(initialStatus?.watchedSeconds ?? 0) // 실제 누적 시청 시간(재생 위치 아님)
    const [progressRate, setProgressRate] = useState(Number(initialStatus?.progressRate ?? 0))

    const lastWatchedSeconds = initialStatus?.lastWatchedSeconds ?? 0
    const canResume = lastWatchedSeconds > 0 && progressRate < TRAINING_COMPLETE_THRESHOLD

    useEffect(() => {
        onDurationChangeRef.current = onDurationChange
    }, [onDurationChange])

    const persist = useCallback((force = false) => {
        const video = videoRef.current
        const videoDuration = video?.duration
        if (!video || !Number.isFinite(videoDuration) || videoDuration <= 0) return

        const cur = video.currentTime

        // 직전 위치 대비 증가폭(delta)이 "정상 재생 범위"일 때만 실제 시청 시간으로 누적한다.
        // 앞으로 스킵(delta 큼)·되감기(delta 음수)는 누적하지 않아 재생바를 당겨도 시청률이 오르지 않는다.
        const delta = cur - lastTimeRef.current
        if (delta > 0 && delta <= MAX_PLAYBACK_STEP_SEC) {
            watchedSecondsRef.current = Math.min(videoDuration, watchedSecondsRef.current + delta)
        }
        lastTimeRef.current = cur

        const watched = watchedSecondsRef.current
        const rate = Math.min(100, Math.round((watched / videoDuration) * 1000) / 10)

        const curFloor = Math.min(Math.floor(cur), Math.floor(videoDuration))
        const watchedFloor = Math.floor(watched)

        setCurrentTime(watchedFloor) // 표시는 재생 위치가 아니라 실제 누적 시청 시간 (시청률과 일치, 스킵해도 안 뜀)
        setProgressRate((prev) => Math.max(prev, rate))

        const payload = {
            progressRate: Math.max(rate, initialProgressRateRef.current),
            watchedSeconds: watchedFloor,
            // 백엔드 제약(lastWatchedSeconds <= watchedSeconds). 스킵으로 위치가 앞서가도 실제 시청분을 넘지 않게 캡.
            lastWatchedSeconds: Math.min(curFloor, watchedFloor),
        }
        const payloadKey = `${payload.progressRate}|${payload.watchedSeconds}|${payload.lastWatchedSeconds}`
        if (!force && payloadKey === lastPayloadRef.current) return

        const now = Date.now()
        if (!force && now - lastSavedRef.current < SAVE_INTERVAL_MS) return

        lastSavedRef.current = now
        lastPayloadRef.current = payloadKey
        onSaveProgressRef.current?.(payload)
    }, [])

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handleLoadedMeta = () => {
            setDuration(video.duration)
            onDurationChangeRef.current?.(video.duration)
            if (!resumedRef.current && lastWatchedSeconds > 0 && lastWatchedSeconds < video.duration) {
                video.currentTime = lastWatchedSeconds
                lastTimeRef.current = lastWatchedSeconds // 이어보기 점프를 스킵으로 오인하지 않도록 기준점 맞춤
                resumedRef.current = true
            }
        }
        const handleTimeUpdate = () => persist(false)
        const handlePause = () => persist(true)
        const handleEnded = () => persist(true)

        video.addEventListener('loadedmetadata', handleLoadedMeta)
        video.addEventListener('timeupdate', handleTimeUpdate)
        video.addEventListener('pause', handlePause)
        video.addEventListener('ended', handleEnded)

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMeta)
            video.removeEventListener('timeupdate', handleTimeUpdate)
            video.removeEventListener('pause', handlePause)
            video.removeEventListener('ended', handleEnded)
            persist(true)
        }
    }, [videoUrl, persist, lastWatchedSeconds])

    const handleResumeClick = () => {
        const video = videoRef.current
        if (!video) return
        video.currentTime = lastWatchedSeconds
        lastTimeRef.current = lastWatchedSeconds // 재개 점프를 스킵으로 오인하지 않도록 기준점 맞춤
        video.play()
    }

    return (
        <div className="training-video-player">
            <div className="training-video-player__frame">
                {videoUrl ? (
                    <video ref={videoRef} src={videoUrl} controls />
                ) : (
                    <div className="training-video-player__empty">
                        영상을 불러올 수 없습니다.
                    </div>
                )}
            </div>

            <div className="training-video-player__meta">
                <span>
                    현재 시청 {formatTime(currentTime)} / 총 {formatTime(duration)}
                </span>
                <span className="training-video-player__rate">시청률 {progressRate.toFixed(1)}%</span>
            </div>

            <div className="training-video-player__bar">
                <div
                    className="training-video-player__bar-fill"
                    style={{ width: `${Math.min(100, progressRate)}%` }}
                />
            </div>

            <div className="training-video-player__toolbar">
                {canResume && (
                    <Button type="button" variant="outline" size="sm" onClick={handleResumeClick}>
                        ▶ {formatTime(lastWatchedSeconds)}부터 이어보기
                    </Button>
                )}
                {onManualComplete && (
                    <Button
                        type="button"
                        variant={manualCompleteDone ? 'success' : 'outline'}
                        size="sm"
                        onClick={onManualComplete}
                    >
                        {manualCompleteDone ? '✓ 영상 시청 완료' : manualCompleteLabel}
                    </Button>
                )}
            </div>
        </div>
    )
}

export default TrainingVideoPlayer
