import { useCallback, useEffect, useMemo, useReducer } from 'react'
import {
  getMyTrainingStatus,
  getTrainingContent,
  updateTrainingVideoProgress,
} from '../api/trainingApi'
import { confirmTrainingGuide } from '../api/guideApi'
import { useAuth } from './useAuth'

const initialState = {
  status: null,
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
 * @param {{ courseType?: import('../constants/trainingCourses').TrainingCourseType }} [options]
 */
export function useTrainingStatus(options = {}) {
  const { courseType = 'QUOTE_WRITE' } = options
  const { isAuthenticated, user } = useAuth()
  const [state, dispatch] = useReducer(trainingReducer, initialState)
  const trainingRequired = user?.role === 'SALES_STAFF' || user?.role === 'SALES_MANAGER'

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return null
    if (!trainingRequired) {
      dispatch({ type: 'FETCH_SUCCESS', status: null })
      return null
    }

    dispatch({ type: 'FETCH_START' })

    try {
      const status = await getMyTrainingStatus()
      dispatch({ type: 'FETCH_SUCCESS', status })
      return status
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', error })
      return null
    }
  }, [isAuthenticated, trainingRequired])

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'FETCH_SUCCESS', status: null })
      return
    }
    refresh()
  }, [isAuthenticated, refresh])

  const loadCourseContent = useCallback(async (type = courseType) => {
    return getTrainingContent(type)
  }, [courseType])

  const saveVideoProgress = useCallback(async (videoId, payload, type = courseType) => {
    try {
      await updateTrainingVideoProgress(videoId, payload, type)
      const status = await getMyTrainingStatus()
      dispatch({ type: 'SET_STATUS', status })
      return status
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', error })
      throw error
    }
  }, [courseType])

  const confirmGuide = useCallback(async (type = courseType) => {
    dispatch({ type: 'ACTION_START' })
    try {
      await confirmTrainingGuide(type)
      const status = await getMyTrainingStatus()
      dispatch({ type: 'SET_STATUS', status })
      return status
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', error })
      throw error
    } finally {
      dispatch({ type: 'ACTION_END' })
    }
  }, [courseType])

  const derived = useMemo(() => {
    if (!trainingRequired) {
      return {
        canWriteQuote: true,
        canReviewApproval: true,
        canClickComplete: true,
        isVideoRequirementMet: true,
        trainingRequired: false,
        additionalTrainingRequired: false,
        requiredCourses: [],
      }
    }

    const status = state.status
    if (!status) {
      return {
        canWriteQuote: false,
        canReviewApproval: false,
        canClickComplete: false,
        isVideoRequirementMet: false,
        trainingRequired: true,
        additionalTrainingRequired: false,
        requiredCourses: [],
      }
    }

    const requiredCourses = status.courses ?? []
    const primaryCourse = requiredCourses.find((course) => !course.completed) ?? requiredCourses[0]
    const activeVideoCount = primaryCourse?.activeVideoCount ?? status.activeVideoCount ?? 0
    const completedVideoCount = primaryCourse?.completedVideoCount ?? status.completedVideoCount ?? 0
    const isVideoRequirementMet = activeVideoCount > 0 && completedVideoCount === activeVideoCount
    const canClickComplete = Boolean(primaryCourse?.completed)
      || (isVideoRequirementMet && (primaryCourse?.guideConfirmed ?? status.guideConfirmed))

    return {
      canWriteQuote: Boolean(status.canWriteQuote),
      canReviewApproval: Boolean(status.canReviewApproval),
      canClickComplete,
      isVideoRequirementMet,
      trainingRequired: true,
      additionalTrainingRequired: Boolean(status.additionalTrainingRequired),
      requiredCourses,
    }
  }, [state.status, trainingRequired])

  return {
    trainingStatus: state.status,
    loading: state.loading,
    actionLoading: state.actionLoading,
    error: state.error,
    refresh,
    loadCourseContent,
    saveVideoProgress,
    confirmGuide,
    ...derived,
  }
}
