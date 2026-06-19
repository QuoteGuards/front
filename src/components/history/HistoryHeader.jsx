const StatDot = ({ color, label, count }) => (
  <div className="flex items-center gap-2 text-sm">
    <span className={`w-2 h-2 rounded-full ${color} inline-block`} />
    <span className="text-gray-500">{label}</span>
    <span className="font-semibold text-gray-700">{count}건</span>
  </div>
)

const HistoryHeader = ({ total, successCount, failCount }) => (
  <div className="px-8 pt-8 pb-5 border-b border-gray-200 bg-white">
    <h1 className="text-xl font-bold text-gray-800">발송 이력</h1>
    <p className="text-sm text-gray-400 mt-1">이메일 발송 내역을 조회합니다.</p>
    <div className="flex gap-4 mt-4">
      <StatDot color="bg-gray-400" label="전체" count={total} />
      <StatDot color="bg-emerald-500" label="성공" count={successCount} />
      <StatDot color="bg-red-400" label="실패" count={failCount} />
    </div>
  </div>
)

export default HistoryHeader
