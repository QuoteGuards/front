import PageHeader from '../../components/common/PageHeader'
import AdminTrainingStatusPanel from '../../components/training/AdminTrainingStatusPanel'

export default function AdminTrainingStatusPage() {
  return (
    <div>
      <PageHeader
        breadcrumbs={['관리', '교육 이수 현황']}
        title="교육 이수 현황"
      />
      <AdminTrainingStatusPanel />
    </div>
  )
}
