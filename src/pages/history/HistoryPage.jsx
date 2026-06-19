import { useHistoryFilter } from '../../hooks/useHistoryFilter'
import HistoryHeader from '../../components/history/HistoryHeader'
import HistoryFilter from '../../components/history/HistoryFilter'
import HistoryTable from '../../components/history/HistoryTable'

const HistoryPage = () => {
  const {
    history,
    filtered,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    successCount,
    failCount,
  } = useHistoryFilter()

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
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
      <HistoryTable rows={filtered} />
    </div>
  )
}

export default HistoryPage
