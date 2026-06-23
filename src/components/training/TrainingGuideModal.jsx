import { useState } from 'react'

// guideContent가 HTML 태그를 포함하면 그대로 렌더링, 아니면 줄바꿈 보존 텍스트로 표시
const isHtml = (text) => /<\/?[a-z][\s\S]*>/i.test(text ?? '')

const TrainingGuideModal = ({ guideContent, alreadyConfirmed, confirming, onConfirm, onClose }) => {
    const [tab, setTab] = useState(0)
    const TABS = ['견적 작성 절차', '할인율 기준', '승인 요청 조건', '견적 작성 예시']

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-start px-6 py-4 border-b border-gray-200 shrink-0">
                    <div>
                        <h3 className="font-semibold text-gray-800">견적 작성 가이드</h3>
                        <p className="text-xs text-gray-400 mt-0.5">견적 작성 전 아래 내용을 반드시 확인하세요</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                        &times;
                    </button>
                </div>

                <div className="flex border-b border-gray-200 px-6 shrink-0">
                    {TABS.map((t, idx) => (
                        <button
                            key={t}
                            onClick={() => setTab(idx)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === idx
                                    ? 'border-violet-600 text-violet-700'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="px-6 py-5 overflow-y-auto flex-1 text-sm text-gray-700 leading-relaxed">
                    {guideContent ? (
                        isHtml(guideContent) ? (
                            <div dangerouslySetInnerHTML={{ __html: guideContent }} />
                        ) : (
                            <p className="whitespace-pre-line">{guideContent}</p>
                        )
                    ) : (
                        <p className="text-gray-400">가이드 내용을 불러오는 중...</p>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
                    <span className="text-xs text-gray-400">
                        {alreadyConfirmed ? '✓ 이미 확인 완료된 가이드입니다.' : '내용을 확인한 후 아래 버튼을 눌러주세요.'}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            닫기
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={confirming}
                            className="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {confirming ? '처리 중...' : alreadyConfirmed ? '확인했습니다' : '가이드를 확인하였습니다.'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TrainingGuideModal
