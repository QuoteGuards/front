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
        <div className="training-summary-grid" role="list">
            <div className="training-summary-card" role="listitem">
                <p className="training-summary-card__label">이수 현황</p>
                <p className={`training-summary-card__value ${isCompleted ? 'training-summary-card__value--done' : 'training-summary-card__value--progress'}`}>
                    {TRAINING_STATUS_LABEL[current] ?? TRAINING_STATUS_LABEL.NOT_STARTED}
                </p>
                <div className="training-summary-card__bar">
                    <div
                        className={`training-summary-card__bar-fill ${isCompleted ? 'training-summary-card__bar-fill--done' : ''}`}
                        style={{ width: `${Math.min(100, progressRate)}%` }}
                    />
                </div>
                <p className="training-summary-card__hint">
                    영상 {completedVideoCount}/{activeVideoCount} 완료 · 최저 시청률 {progressRate.toFixed(0)}%
                </p>
            </div>

            <div className="training-summary-card" role="listitem">
                <p className="training-summary-card__label">예상 소요 시간</p>
                <p className="training-summary-card__value">{formatDuration(durationSeconds)}</p>
                <p className="training-summary-card__hint">
                    활성 영상 각 {TRAINING_COMPLETE_THRESHOLD}% 이상 시청 필요
                </p>
            </div>

            <div className="training-summary-card training-summary-card--benefits" role="listitem">
                <p className="training-summary-card__label">이수 완료 혜택</p>
                <ul className="training-summary-card__list">
                    <li>견적 작성 화면 접근 가능</li>
                    <li>견적서 발송 기능 활성화</li>
                </ul>
            </div>
        </div>
    )
}

export default TrainingSummaryCards
