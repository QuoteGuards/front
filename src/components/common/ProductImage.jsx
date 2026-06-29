import { useEffect, useState } from 'react'

// 제품 이미지 — src가 없거나 로드 실패(404 등) 시 "이미지" 플레이스홀더로 폴백
// imageUrl을 텍스트로 직접 입력하는 구조라 깨진 URL이 흔해 빈 박스 대신 폴백 표시
export default function ProductImage({ src, className = 'w-full h-full object-cover', label = '이미지' }) {
  const [failed, setFailed] = useState(false)
  // src가 바뀌면(상세→연관제품 이동 등) 실패 상태 초기화
  useEffect(() => { setFailed(false) }, [src])

  if (!src || failed) {
    return <span className="text-[var(--color-text-muted)] text-sm">{label}</span>
  }
  return <img src={src} alt="" className={className} onError={() => setFailed(true)} />
}
