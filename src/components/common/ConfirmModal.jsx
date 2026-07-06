import { useEffect, useRef } from 'react'
import Button from './Button'

// 재사용 확인 모달 (useConfirm 훅과 함께 사용)
export default function ConfirmModal({
  title = '확인',
  message = '',
  confirmText = '확인',
  cancelText = '취소',
  danger = false,
  onConfirm,
  onCancel,
}) {
  const modalRef = useRef(null)

  // 열릴 때 모달로 포커스 이동 → 뒤 버튼에 Enter가 되돌아가지 않게
  useEffect(() => { modalRef.current?.focus() }, [])

  // Esc = 취소, Enter = 확인 (기본 동작 막아 뒤 버튼 재클릭 방지)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      else if (e.key === 'Enter') { e.preventDefault(); onConfirm() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onConfirm, onCancel])

  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '16px' }}>
      <div ref={modalRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--color-bg-white)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: '380px', boxShadow: 'var(--shadow-md)', overflow: 'hidden', outline: 'none' }}>
        <div style={{ padding: '20px 24px 4px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '8px' }}>{title}</h2>
          {message && (
            <p style={{ fontSize: '14px', color: 'var(--color-text-sub)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{message}</p>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px 20px' }}>
          <Button variant="outline" size="sm" onClick={onCancel}>{cancelText}</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  )
}
