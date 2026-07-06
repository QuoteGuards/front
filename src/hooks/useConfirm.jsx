import { useState, useRef, useCallback } from 'react'
import ConfirmModal from '../components/common/ConfirmModal'

/**
 * 확인 모달 훅. confirm(opts)를 호출하면 Promise<boolean> 반환.
 * 사용: const { confirm, confirmModal } = useConfirm()
 *   if (!(await confirm({ title, message, danger: true }))) return
 *   ... 그리고 JSX에 {confirmModal} 렌더
 */
export function useConfirm() {
  const [opts, setOpts] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((options = {}) => {
    setOpts(options)
    return new Promise((resolve) => { resolver.current = resolve })
  }, [])

  const settle = useCallback((result) => {
    setOpts(null)
    if (resolver.current) { resolver.current(result); resolver.current = null }
  }, [])

  const confirmModal = opts ? (
    <ConfirmModal {...opts} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
  ) : null

  return { confirm, confirmModal }
}
