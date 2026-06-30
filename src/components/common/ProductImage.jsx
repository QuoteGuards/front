import { useState } from 'react'

// 제품 이미지 — src가 없거나 로드 실패(404 등) 시 "이미지" 플레이스홀더로 폴백
// img는 부모(반드시 position:relative + 고정 비율/높이) 박스를 absolute로 가득 채워 object-fit:cover.
// → 이미지 원본 크기가 컨테이너 높이를 밀어내지 않아 카드 높이가 균일하게 유지됨.
export default function ProductImage({ src, label = '이미지' }) {
  const [failedSrc, setFailedSrc] = useState(null)

  if (!src || failedSrc === src) {
    return <span className="text-[var(--color-text-muted)] text-sm">{label}</span>
  }
  return (
    <img
      src={src}
      alt=""
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      onError={() => setFailedSrc(src)}
    />
  )
}
