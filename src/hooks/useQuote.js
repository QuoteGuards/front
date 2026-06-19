import { useState, useEffect } from 'react'
import { getQuote } from '../api/quoteApi'

export const useQuote = (id) => {
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getQuote(id)
      .then((data) => { if (!cancelled) setQuote(data) })
      .catch((err) => { if (!cancelled) setError(err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  return { quote, loading, error }
}
