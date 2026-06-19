import { useState } from 'react'
import { HISTORY_STORAGE_KEY } from '../constants/mockHistory'

export const useHistoryFilter = () => {
  const [history] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]')
    } catch {
      return []
    }
  })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('전체')

  const filtered = history
    .filter((h) => statusFilter === '전체' || h.status === statusFilter)
    .filter(
      (h) =>
        !search ||
        h.to.includes(search) ||
        h.quoteId.includes(search) ||
        h.buyer.includes(search) ||
        h.subject.includes(search)
    )
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))

  const successCount = history.filter((h) => h.status === '성공').length
  const failCount = history.filter((h) => h.status === '실패').length

  return {
    history,
    filtered,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    successCount,
    failCount,
  }
}
