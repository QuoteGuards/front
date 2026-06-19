import { useState, useEffect } from 'react'
import { getQuote } from '../api/quoteApi'

export const useQuote = (id) => {
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    getQuote(id)
      .then(setQuote)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [id])

  return { quote, loading, error }
}
