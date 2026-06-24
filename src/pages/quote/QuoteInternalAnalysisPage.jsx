import { useNavigate } from 'react-router-dom';

const QuoteInternalAnalysisPage = () => {
    const navigate = useNavigate();

    return (
        <div className="flex-1 bg-gray-50 min-h-screen pb-24">
            {/* 상단 헤더 */}
            <div className="bg-white border-b border-gray-200 px-8 py-5">
                <h1 className="text-xl font-bold text-gray-800">내부 견적 분석</h1>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                {/*요약 카드 섹션 */}
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { title: '총 공급가액', val: '470,000' },
                        { title: '총 원가', val: '350,000' },
                        { title: '예상 이익금', val: '90,000' },
                        { title: '전체 이익률', val: '19.1%' }
                    ].map((item) => (
                        <div key={item.title} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-xs text-gray-500 mb-1">{item.title}</p>
                            <p className="text-xl font-bold text-gray-800">{item.val} <span className="text-sm font-normal">원</span></p>
                        </div>
                    ))}
                </div>

                {/*제품별 분석 테이블 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-800 mb-4">제품별 내부 분석</h2>
                    <table className="w-full text-sm text-center">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>{['제품명', '판매가', '원가', '할인율', '이익금', '이익률', '승인여부'].map(h => <th key={h} className="py-3 font-medium">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            <tr className="border-t">
                                <td className="py-3">제품 A</td>
                                <td>90,000</td>
                                <td>70,000</td>
                                <td>10%</td>
                                <td>20,000</td>
                                <td className="text-green-600 font-bold">22.2%</td>
                                <td><span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">승인불필요</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/*승인 필요 여부 판단 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-3">
                    <h2 className="text-sm font-bold text-gray-800">승인 필요 여부 판단</h2>
                    <div className="bg-red-50 p-4 rounded-lg text-sm text-red-600 border border-red-100">
                        <p>• 할인율 정책 초과 / 이익률 미달</p>
                    </div>
                </div>
            </div>

            {/* 하단 고정 버튼 */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-end gap-3 z-20">
                <div className="max-w-5xl mx-auto w-full flex justify-between">
                    <div className="flex gap-3">
                        <button onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-lg border hover:bg-gray-50">견적 수정</button>
                        <button className="px-6 py-2.5 rounded-lg border hover:bg-gray-50">견적 미리보기</button>
                    </div>
                    <button className="px-10 py-2.5 rounded-lg bg-violet-600 text-white font-bold hover:bg-violet-700">승인 요청 제출</button>
                </div>
            </div>
        </div>
    );
};

export default QuoteInternalAnalysisPage;