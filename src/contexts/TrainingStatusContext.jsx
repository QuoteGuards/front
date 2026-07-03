/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
import { useTrainingStatus } from '../hooks/useTrainingStatus'

const TrainingStatusContext = createContext(null)

/**
 * 교육 이수 상태를 앱 전체에서 공유하기 위한 컨텍스트.
 * Sidebar와 TrainingPage가 동일한 상태를 바라보므로
 * 교육 완료 시 사이드바 자물쇠 아이콘이 즉시 사라진다.
 */
export function TrainingStatusProvider({ children }) {
  const training = useTrainingStatus()
  return (
    <TrainingStatusContext.Provider value={training}>
      {children}
    </TrainingStatusContext.Provider>
  )
}

export function useTrainingStatusContext() {
  const ctx = useContext(TrainingStatusContext)
  if (!ctx) {
    throw new Error('useTrainingStatusContext must be used inside TrainingStatusProvider')
  }
  return ctx
}
