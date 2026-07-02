import { TRAINING_STATUS, TRAINING_STATUS_LABEL, TRAINING_COMPLETE_THRESHOLD } from '../../constants/training'

const formatDuration = (sec) => {
    if (!sec) return '약 -분'
    const m = Math.round(sec / 60)
    return `약 ${m}분`
}

const TrainingSummaryCards = ({ status, durationSeconds, activeVideoCount = 0, completedVideoCount = 0 }) => {
    const current = status?.status ?? TRAINING_STATUS.NOT_STARTED
    const isCompleted = current === TRAINING_STATUS.COMPLETED && Boolean(status?.completed)
    const progressRate = Number(status?.progressRate ?? 0)

    return (
        <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <p className="text-xs text-gray-400 mb-2">이수 현황</p>
                <p className={`text-lg font-bold mb-2 ${isCompleted ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {TRAINING_STATUS_LABEL[current] ?? TRAINING_STATUS_LABEL.NOT_STARTED}
                </p>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-1.5">
                    <div
                        className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-violet-500'}`}
                        style={{ width: `${Math.min(100, progressRate)}%` }}
                    />
                </div>
                <p className="text-xs text-gray-400">
                    영상 {completedVideoCount}/{activeVideoCount} 완료 · 최저 시청률 {progressRate.toFixed(0)}%
                </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <p className="text-xs text-gray-400 mb-2">예상 소요 시간</p>
                <p className="text-lg font-bold text-gray-800 mb-2">{formatDuration(durationSeconds)}</p>
                <p className="text-xs text-gray-400">활성 영상 각 {TRAINING_COMPLETE_THRESHOLD}% 이상 시청 필요</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <p className="text-xs text-gray-400 mb-2">이수 완료 혜택</p>
                <ul className="space-y-1.5 mt-1">
                    <li className="text-xs text-gray-600 flex items-center gap-1.5">
                        <span className="text-emerald-500">✓</span> 견적 작성 화면 접근 가능
                    </li>
                    <li className="text-xs text-gray-600 flex items-center gap-1.5">
                        <span className="text-emerald-500">✓</span> 견적서 발송 기능 활성화
                    </li>
                </ul>
            </div>
        </div>
    )
}

export default TrainingSummaryCards
