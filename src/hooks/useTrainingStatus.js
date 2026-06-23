import { useCallback, useEffect, useMemo, useReducer } from 'react'
import {
  getMyTrainingStatus,
  getQuoteWritingContent,
  updateTrainingProgress,
} from '../api/trainingApi'
import { confirmQuoteWritingGuide } from '../api/guideApi'
import { TRAINING_COMPLETE_THRESHOLD } from '../constants/training'
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
 * 견적 작성 교육 이수 상태 조회 및 진도/가이드 확인 API 연동
 *
 * @param {{ loadContent?: boolean }} [options]
 */
export function useTrainingStatus(options = {}) {
  const { loadContent = false } = options
  const { isAuthenticated } = useAuth()
  const [state, dispatch] = useReducer(trainingReducer, initialState)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return null

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
  }, [isAuthenticated, loadContent])

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'FETCH_SUCCESS', status: null, content: null })
      return
    }
    refresh()
  }, [isAuthenticated, refresh])

  const saveProgress = useCallback(
    async (payload) => {
      dispatch({ type: 'ACTION_START' })
      try {
        await updateTrainingProgress(payload)
        const status = await getMyTrainingStatus()
        dispatch({ type: 'SET_STATUS', status })
        return status
      } catch (error) {
        dispatch({ type: 'FETCH_ERROR', error })
        throw error
      } finally {
        dispatch({ type: 'ACTION_END' })
      }
    },
    []
  )

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
    const status = state.status
    if (!status) {
      return {
        canWriteQuote: false,
        canClickComplete: false,
        isVideoRequirementMet: false,
      }
    }

    const isVideoRequirementMet = status.progressRate >= TRAINING_COMPLETE_THRESHOLD
    const canClickComplete = isVideoRequirementMet && status.guideConfirmed

    return {
      canWriteQuote: status.completed,
      canClickComplete,
      isVideoRequirementMet,
    }
  }, [state.status])

  return {
    /** @type {import('../api/trainingApi').TrainingStatus | null} */
    trainingStatus: state.status,
    /** @type {import('../api/trainingApi').TrainingContent | null} */
    trainingContent: state.content,
    loading: state.loading,
    actionLoading: state.actionLoading,
    error: state.error,
    refresh,
    saveProgress,
    confirmGuide,
    ...derived,
  }
}
