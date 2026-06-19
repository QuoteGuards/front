import { useState, useEffect } from 'react'
import { getQuotes } from '../api/quoteApi'

export const useQuotes = () => {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getQuotes()
      .then((data) => { if (!cancelled) setQuotes(data) })
      .catch((err) => { if (!cancelled) setError(err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { quotes, loading, error }
}
