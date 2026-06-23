import { useEffect, useReducer } from 'react'
import { getQuote } from '../api/quoteApi'

function fetchReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':   return { quote: null, loading: true, error: null }
    case 'FETCH_SUCCESS': return { quote: action.data, loading: false, error: null }
    case 'FETCH_ERROR':   return { quote: null, loading: false, error: action.error }
    default: return state
  }
}

export const useQuote = (id) => {
  const [{ quote, loading, error }, dispatch] = useReducer(
    fetchReducer,
    { quote: null, loading: !!id, error: null }
  )

  useEffect(() => {
    if (!id) return
    let cancelled = false
    dispatch({ type: 'FETCH_START' })
    getQuote(id)
      .then((data) => { if (!cancelled) dispatch({ type: 'FETCH_SUCCESS', data }) })
      .catch((error) => { if (!cancelled) dispatch({ type: 'FETCH_ERROR', error }) })
    return () => { cancelled = true }
  }, [id])

  return { quote, loading, error }
}
