import { useCallback, useEffect, useMemo, useReducer } from 'react'
import {
  getMyTrainingStatus,
  getQuoteWritingContent,
  updateTrainingVideoProgress,
} from '../api/trainingApi'
import { confirmQuoteWritingGuide } from '../api/guideApi'
import { useAuth } from './useAuth'

const initialState = {
  status: null,
  content: null,
  loading: false,
  error: null,
  actionLoading: false,
}

function trainingReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null }
    case 'FETCH_SUCCESS':
      return {
        ...state,
        status: action.status,
        content: action.content ?? state.content,
        loading: false,
        error: null,
      }
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error }
    case 'ACTION_START':
      return { ...state, actionLoading: true, error: null }
    case 'ACTION_END':
      return { ...state, actionLoading: false }
    case 'SET_STATUS':
      return { ...state, status: action.status }
    default:
      return state
  }
}

/**
 * @param {{ loadContent?: boolean }} [options]
 */
export function useTrainingStatus(options = {}) {
  const { loadContent = false } = options
  const { isAuthenticated, user } = useAuth()
  const [state, dispatch] = useReducer(trainingReducer, initialState)
  const trainingRequired = user?.role === 'SALES_STAFF'

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return null
    if (!trainingRequired) {
      dispatch({ type: 'FETCH_SUCCESS', status: null, content: null })
      return null
    }

    dispatch({ type: 'FETCH_START' })

    try {
      const statusPromise = getMyTrainingStatus()
      const contentPromise = loadContent ? getQuoteWritingContent() : Promise.resolve(null)
      const [status, content] = await Promise.all([statusPromise, contentPromise])

      dispatch({ type: 'FETCH_SUCCESS', status, content })
      return status
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', error })
      return null
    }
  }, [isAuthenticated, loadContent, trainingRequired])

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'FETCH_SUCCESS', status: null, content: null })
      return
    }
    refresh()
  }, [isAuthenticated, refresh])

  const saveVideoProgress = useCallback(async (videoId, payload) => {
    try {
      await updateTrainingVideoProgress(videoId, payload)
      const status = await getMyTrainingStatus()
      dispatch({ type: 'SET_STATUS', status })
      return status
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', error })
      throw error
    }
  }, [])

  const confirmGuide = useCallback(async () => {
    dispatch({ type: 'ACTION_START' })
    try {
      await confirmQuoteWritingGuide()
      const status = await getMyTrainingStatus()
      dispatch({ type: 'SET_STATUS', status })
      return status
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', error })
      throw error
    } finally {
      dispatch({ type: 'ACTION_END' })
    }
  }, [])

  const derived = useMemo(() => {
    if (!trainingRequired) {
      return {
        canWriteQuote: true,
        canClickComplete: true,
        isVideoRequirementMet: true,
        trainingRequired: false,
        additionalTrainingRequired: false,
      }
    }

    const status = state.status
    if (!status) {
      return {
        canWriteQuote: false,
        canClickComplete: false,
        isVideoRequirementMet: false,
        trainingRequired: true,
        additionalTrainingRequired: false,
      }
    }

    const activeVideoCount = status.activeVideoCount ?? 0
    const completedVideoCount = status.completedVideoCount ?? 0
    const isVideoRequirementMet = activeVideoCount > 0 && completedVideoCount === activeVideoCount
    const canClickComplete = isVideoRequirementMet && status.guideConfirmed

    return {
      canWriteQuote: status.completed,
      canClickComplete,
      isVideoRequirementMet,
      trainingRequired: true,
      additionalTrainingRequired: Boolean(status.additionalTrainingRequired),
    }
  }, [state.status, trainingRequired])

  return {
    trainingStatus: state.status,
    trainingContent: state.content,
    loading: state.loading,
    actionLoading: state.actionLoading,
    error: state.error,
    refresh,
    saveVideoProgress,
    confirmGuide,
    ...derived,
  }
}
