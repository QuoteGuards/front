const STATUSES = ['전체', '성공', '실패']

const HistoryFilter = ({ search, onSearch, statusFilter, onStatusChange, resultCount }) => (
  <div className="px-8 py-4 flex gap-3 items-center">
    <input
      type="text"
      placeholder="수신자 / 견적번호 / 회사명 검색"
      value={search}
      onChange={(e) => onSearch(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
    />
    <div className="flex gap-1">
      {STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => onStatusChange(s)}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
            statusFilter === s
              ? 'bg-violet-600 text-white'
              : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
    <span className="text-sm text-gray-400 ml-auto">{resultCount}건 표시 중</span>
  </div>
)

export default HistoryFilter
