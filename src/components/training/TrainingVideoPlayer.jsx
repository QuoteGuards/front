import { useEffect, useRef, useState, useCallback } from 'react'
import { TRAINING_COMPLETE_THRESHOLD } from '../../constants/training'

const SAVE_INTERVAL_MS = 7000 // 5~10초 사이 debounce

const formatTime = (sec) => {
    const s = Math.max(0, Math.floor(sec || 0))
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

const TrainingVideoPlayer = ({ videoUrl, initialStatus, onSaveProgress, onDurationChange }) => {
    const videoRef = useRef(null)
    const maxWatchedRef = useRef(initialStatus?.watchedSeconds ?? 0)
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
            maxWatchedRef.current = Math.max(maxWatchedRef.current, initialStatus.watchedSeconds)
        }
    }, [initialStatus?.progressRate, initialStatus?.watchedSeconds])

    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(initialStatus?.lastWatchedSeconds ?? 0)
    const [progressRate, setProgressRate] = useState(Number(initialStatus?.progressRate ?? 0))

    const lastWatchedSeconds = initialStatus?.lastWatchedSeconds ?? 0
    const canResume = lastWatchedSeconds > 0 && progressRate < TRAINING_COMPLETE_THRESHOLD

    useEffect(() => {
        onDurationChangeRef.current = onDurationChange
    }, [onDurationChange])

    const persist = useCallback((force = false, ended = false) => {
        const video = videoRef.current
        const videoDuration = video?.duration
        if (!video || !Number.isFinite(videoDuration) || videoDuration <= 0) return

        const cur = ended ? Math.ceil(videoDuration) : Math.floor(video.currentTime)
        maxWatchedRef.current = Math.max(maxWatchedRef.current, cur)

        const rate = ended
            ? 100
            : Math.min(100, Math.round((maxWatchedRef.current / videoDuration) * 1000) / 10)

        setCurrentTime(Math.min(cur, Math.floor(videoDuration)))
        setProgressRate((prev) => Math.max(prev, rate))

        const payload = {
            progressRate: Math.max(rate, initialProgressRateRef.current),
            watchedSeconds: maxWatchedRef.current,
            lastWatchedSeconds: Math.min(cur, Math.floor(videoDuration)),
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
                resumedRef.current = true
            }
        }
        const handleTimeUpdate = () => persist(false)
        const handlePause = () => persist(true)
        const handleEnded = () => persist(true, true)

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
    }, [videoUrl, persist])

    const handleResumeClick = () => {
        const video = videoRef.current
        if (!video) return
        video.currentTime = lastWatchedSeconds
        video.play()
    }

    return (
        <div>
            <div className="rounded-xl overflow-hidden bg-black aspect-video">
                {videoUrl ? (
                    <video ref={videoRef} src={videoUrl} controls className="w-full h-full" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                        영상을 불러올 수 없습니다.
                    </div>
                )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>
                    현재 시청 시간 {formatTime(currentTime)} / 영상 총 길이 {formatTime(duration)}
                </span>
                <span className="font-semibold text-violet-700">시청률 {progressRate.toFixed(1)}%</span>
            </div>

            <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                    className="h-full bg-violet-600 transition-all"
                    style={{ width: `${Math.min(100, progressRate)}%` }}
                />
            </div>

            {canResume && (
                <button
                    onClick={handleResumeClick}
                    className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-violet-300 text-violet-700 hover:bg-violet-50 transition-colors"
                >
                    ▶ {formatTime(lastWatchedSeconds)}부터 이어보기
                </button>
            )}
        </div>
    )
}

export default TrainingVideoPlayer
