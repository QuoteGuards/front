import { useState, useEffect } from 'react'
import { getEmailHistory } from '../api/emailApi'

export const useHistoryFilter = () => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('전체')

  useEffect(() => {
    let cancelled = false
    getEmailHistory()
      .then((data) => { if (!cancelled) setHistory(data) })
      .catch((err) => { if (!cancelled) setError(err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = history
    .filter((h) => statusFilter === '전체' || h.status === statusFilter)
    .filter(
      (h) =>
        !search ||
        h.to.includes(search) ||
        h.quoteId.includes(search) ||
        (h.buyer ?? '').includes(search) ||
        h.subject.includes(search)
    )
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))

  const successCount = history.filter((h) => h.status === '성공').length
  const failCount = history.filter((h) => h.status === '실패').length

  return {
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
  }
}
