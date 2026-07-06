import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * 간단한 토스트 상태 훅. showToast로 띄우고 duration(ms) 후 자동 사라짐.
 * 반환한 toast를 <Toast message type onClose={hideToast} />에 연결해 사용.
 */
export function useToast(duration = 2500) {
  const [toast, setToast] = useState(null) // { message, type } | null
  const timer = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), duration)
  }, [duration])

  const hideToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setToast(null)
  }, [])

  // 언마운트 시 타이머 정리
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return { toast, showToast, hideToast }
}
