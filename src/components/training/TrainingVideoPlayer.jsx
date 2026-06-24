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
    const resumedRef = useRef(false)
    const onDurationChangeRef = useRef(onDurationChange)

    useEffect(() => {
        onDurationChangeRef.current = onDurationChange
    }, [onDurationChange])

    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(initialStatus?.lastWatchedSeconds ?? 0)
    const [progressRate, setProgressRate] = useState(Number(initialStatus?.progressRate ?? 0))

    const lastWatchedSeconds = initialStatus?.lastWatchedSeconds ?? 0
    const canResume = lastWatchedSeconds > 0 && progressRate < TRAINING_COMPLETE_THRESHOLD

    const persist = useCallback(
        (force = false) => {
            const video = videoRef.current
            if (!video || !duration) return

            const cur = Math.floor(video.currentTime)
            maxWatchedRef.current = Math.max(maxWatchedRef.current, cur)
            const rate = Math.min(100, Math.round((maxWatchedRef.current / duration) * 1000) / 10)

            setCurrentTime(cur)
            setProgressRate((prev) => Math.max(prev, rate))

            const now = Date.now()
            if (!force && now - lastSavedRef.current < SAVE_INTERVAL_MS) return
            lastSavedRef.current = now

            onSaveProgress?.({
                progressRate: Math.max(rate, Number(initialStatus?.progressRate ?? 0)),
                watchedSeconds: maxWatchedRef.current,
                lastWatchedSeconds: cur,
            })
        },
        [duration, onSaveProgress, initialStatus]
    )

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoUrl])

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
