import { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import { useHistoryFilter } from '../../hooks/useHistoryFilter'
import HistoryFilter from '../../components/history/HistoryFilter'
import HistoryTable from '../../components/history/HistoryTable'

const HistoryPage = () => {
  const [searchInput, setSearchInput] = useState('')
  const {
    history,
    filtered,
    loading,
    error,
    setSearch,
    statusFilter,
    setStatusFilter,
    successCount,
    failCount,
  } = useHistoryFilter()

  const onSearch = () => setSearch(searchInput.trim())
  const onSearchKeyDown = (e) => { if (e.key === 'Enter') onSearch() }

  return (
    <div>
      <PageHeader breadcrumbs={['견적 관리', '발송 이력']} title="발송 이력" />
      <HistoryFilter
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearch={onSearch}
        onSearchKeyDown={onSearchKeyDown}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        resultCount={filtered.length}
        total={history.length}
        successCount={successCount}
        failCount={failCount}
      />
      {loading ? (
        <p className="text-center text-sm py-16" style={{ color: 'var(--color-text-muted)' }}>
          발송 이력을 불러오는 중...
        </p>
      ) : error ? (
        <p className="text-center text-sm py-16" style={{ color: 'var(--color-danger)' }}>
          발송 이력을 불러올 수 없습니다.
        </p>
      ) : (
        <HistoryTable rows={filtered} />
      )}
    </div>
  )
}

export default HistoryPage
