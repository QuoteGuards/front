import { useState, useEffect } from 'react'
import { getQuotes } from '../api/quoteApi'

export const useQuotes = () => {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getQuotes()
      .then(setQuotes)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { quotes, loading, error }
}
