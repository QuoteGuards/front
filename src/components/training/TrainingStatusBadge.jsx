import { TRAINING_STATUS, TRAINING_STATUS_LABEL } from '../../constants/training'

const STYLES = {
    [TRAINING_STATUS.NOT_STARTED]: 'bg-gray-100 text-gray-500',
    [TRAINING_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
    [TRAINING_STATUS.COMPLETED]: 'bg-emerald-100 text-emerald-700',
}

const TrainingStatusBadge = ({ status }) => (
    <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STYLES[status] ?? STYLES[TRAINING_STATUS.NOT_STARTED]
            }`}
    >
        {TRAINING_STATUS_LABEL[status] ?? TRAINING_STATUS_LABEL[TRAINING_STATUS.NOT_STARTED]}
    </span>
)

export default TrainingStatusBadge
