import { Navigate } from 'react-router-dom'

/** @deprecated `/admin/trainings?tab=status` 로 통합 */
export default function AdminTrainingStatusPage() {
  return <Navigate to="/admin/trainings?tab=status" replace />
}
