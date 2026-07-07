// AI 응답(Gemini)에 간혹 섞여 오는 "**굵게**" 마크다운만 가볍게 처리해 <strong>으로 바꿔주는
// 최소한의 인라인 렌더러. 별도 마크다운 라이브러리는 사용하지 않는다.
// (AdminApprovalDetailPage의 AI 리스크 요약 렌더링과 동일한 방식)
export function renderInlineMarkdown(text, strongClassName = 'font-semibold') {
    if (!text) return text
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return (
                <strong key={idx} className={strongClassName}>
                    {part.slice(2, -2)}
                </strong>
            )
        }
        return part
    })
}
