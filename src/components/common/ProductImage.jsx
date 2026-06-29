import { useState } from 'react'

// 제품 이미지 — src가 없거나 로드 실패(404 등) 시 "이미지" 플레이스홀더로 폴백
// imageUrl을 텍스트로 직접 입력하는 구조라 깨진 URL이 흔해 빈 박스 대신 폴백 표시
export default function ProductImage({ src, className = 'w-full h-full object-cover', label = '이미지' }) {
  // 실패를 src 기준으로 추적 → src가 바뀌면 이전 실패 상태가 남지 않고 즉시 새 이미지 시도(플래시 없음)
  const [failedSrc, setFailedSrc] = useState(null)

  if (!src || failedSrc === src) {
    return <span className="text-[var(--color-text-muted)] text-sm">{label}</span>
  }
  return <img src={src} alt="" className={className} onError={() => setFailedSrc(src)} />
}
