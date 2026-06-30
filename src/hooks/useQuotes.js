import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getQuotes, getAdminQuotes, getManagerQuotes } from '../api/quoteApi'

/** @param {'mine'|'team'} managerListMode — SALES_MANAGER 전용: 내 견적 / 담당 견적 */
export const useQuotes = (managerListMode = 'mine') => {
  const { user } = useAuth()
  const role = user?.role

  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isTeamView =
    role === 'SUPER_ADMIN' ||
    (role === 'SALES_MANAGER' && managerListMode === 'team')

  const serverSearch = isTeamView

  const loadQuotesData = useCallback(async (filters = {}) => {
    if (role === 'SUPER_ADMIN') {
      const params = {}
      if (filters.customerName?.trim()) params.customerName = filters.customerName.trim()
      if (filters.quoteNumber?.trim()) params.quoteNumber = filters.quoteNumber.trim()
      if (filters.writerName?.trim()) params.writerName = filters.writerName.trim()
      return getAdminQuotes(params)
    }
    if (role === 'SALES_MANAGER' && managerListMode === 'team') {
      const params = {}
      if (filters.customerName?.trim()) params.customerName = filters.customerName.trim()
      if (filters.quoteNumber?.trim()) params.quoteNumber = filters.quoteNumber.trim()
      if (filters.writerName?.trim()) params.writerName = filters.writerName.trim()
      return getManagerQuotes(params)
    }
    return getQuotes()
  }, [role, managerListMode])

  const fetchQuotes = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      const list = await loadQuotesData(filters)
      setQuotes(list)
    } catch {
      setError('목록을 불러올 수 없습니다.')
      setQuotes([])
    } finally {
      setLoading(false)
    }
  }, [loadQuotesData])

  useEffect(() => {
    if (!role) return
    let cancelled = false

    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })

    loadQuotesData()
      .then((list) => {
        if (!cancelled) setQuotes(list)
      })
      .catch(() => {
        if (!cancelled) {
          setError('목록을 불러올 수 없습니다.')
          setQuotes([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [role, managerListMode, loadQuotesData])

  return { quotes, loading, error, fetchQuotes, serverSearch, role, isTeamView }
}
