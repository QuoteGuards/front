import { useState } from 'react'

const TrainingGuideModal = ({ onClose, onConfirm, alreadyConfirmed, confirming }) => {
    const [tab, setTab] = useState(0)
    const TABS = ['견적 작성 절차', '할인율 기준', '승인 요청 조건', '견적 작성 예시']

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && !confirming && onClose?.()}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[700px] flex flex-col overflow-hidden">
                {/* 헤더 */}
                <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 shrink-0">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">견적 작성 가이드</h3>
                        <p className="text-sm text-gray-400">견적 작성 전 아래 내용을 반드시 확인하세요</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={confirming}
                        aria-label="닫기"
                        className="text-gray-400 hover:text-gray-600 text-3xl leading-none disabled:opacity-50"
                    >
                        &times;
                    </button>
                </div>

                {/* 탭 */}
                <div className="flex border-b border-gray-200 px-8">
                    {TABS.map((t, idx) => (
                        <button key={t} onClick={() => setTab(idx)} className={`px-6 py-4 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === idx ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-400'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                {/* 본문 */}
                <div className="px-8 py-6 overflow-y-auto flex-1 bg-gray-50/50">
                    {tab === 0 && (
                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-800">① 견적 작성 절차</h4>
                            <div className="flex items-center gap-3">
                                {['STEP 1: 고객 검색', 'STEP 2: 제품 선택', 'STEP 3: 수량/할인 입력', 'STEP 4: 제출/승인'].map((step, i) => (
                                    <div key={i} className="flex-1 text-center py-6 px-2 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-700">{step}</div>
                                ))}
                            </div>
                        </div>
                    )}
                    {tab === 1 && (
                        <table className="w-full bg-white border text-sm">
                            <thead className="bg-gray-100"><tr>{['카테고리', '최대 할인율', '최소 이익률', '초과 시'].map(h => <th key={h} className="p-3 border">{h}</th>)}</tr></thead>
                            <tbody>
                                {[['사무용 가구', '10%', '20%', '승인 요청 필요'], ['IT 장비', '8%', '25%', '승인 요청 필요']].map((row, i) => (
                                    <tr key={i}>{row.map((cell, j) => <td key={j} className="p-3 border text-center">{cell}</td>)}</tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {tab === 2 && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-red-50 border rounded-lg text-sm text-red-800">
                                <p className="font-bold mb-2">승인 요청 필요한 경우</p>
                                <ul className="list-disc pl-5"><li>할인율 정책 초과</li><li>이익률 미달</li></ul>
                            </div>
                            <div className="p-4 bg-green-50 border rounded-lg text-sm text-green-800">
                                <p className="font-bold mb-2">즉시 발송 가능한 경우</p>
                                <ul className="list-disc pl-5"><li>정책 기준 이내</li><li>정상 범위 이익률</li></ul>
                            </div>
                        </div>
                    )}
                    {tab === 3 && (
                        <div className="bg-white p-4 border rounded-xl text-sm">
                            <p className="font-bold text-orange-600 mb-2">모의 고객 요구사항</p>
                            <p>사무용 의자 5개(단가 100,000원) 요청. 예산 150만원 이내 희망.</p>
                        </div>
                    )}
                </div>

                {/* 하단 버튼 */}
                <div className="px-8 py-5 border-t border-gray-200 flex justify-between items-center shrink-0">
                    <span className="text-xs text-gray-400">{alreadyConfirmed ? '✓ 확인 완료' : '내용 확인 후 버튼을 눌러주세요.'}</span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={confirming}
                            className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            닫기
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={confirming || alreadyConfirmed}
                            className="px-8 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 disabled:bg-gray-400 transition-colors"
                        >
                            {alreadyConfirmed ? '확인 완료' : confirming ? '처리 중...' : '가이드를 확인하였습니다.'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TrainingGuideModal