import PageHeader from '../../components/common/PageHeader'
import { useHistoryFilter } from '../../hooks/useHistoryFilter'
import HistoryHeader from '../../components/history/HistoryHeader'
import HistoryFilter from '../../components/history/HistoryFilter'
import HistoryTable from '../../components/history/HistoryTable'

const HistoryPage = () => {
  const {
    history,
    filtered,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    successCount,
    failCount,
  } = useHistoryFilter()

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <PageHeader breadcrumbs={['견적 관리', '발송 이력']} />
    <HistoryHeader
        total={history.length}
        successCount={successCount}
        failCount={failCount}
      />
      <HistoryFilter
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        resultCount={filtered.length}
      />
      {loading ? (
        <p className="px-8 py-16 text-center text-sm text-gray-400">발송 이력을 불러오는 중...</p>
      ) : error ? (
        <p className="px-8 py-16 text-center text-sm text-red-400">발송 이력을 불러올 수 없습니다.</p>
      ) : (
        <HistoryTable rows={filtered} />
      )}
    </div>
  )
}

export default HistoryPage
