import SearchPanel, { SearchRow } from '../common/SearchPanel'
import SegmentedControl from '../common/SegmentedControl'
import Button from '../common/Button'

const STATUSES = ['전체', '성공', '실패']
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s }))

const HistoryFilter = ({
  searchInput, onSearchInputChange, onSearch, onSearchKeyDown,
  statusFilter, onStatusChange,
  resultCount, total, successCount, failCount,
}) => (
  <SearchPanel>
    <SearchRow label="발송 상태">
      <SegmentedControl
        variant="pills"
        name="history-status"
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={onStatusChange}
      />
      {/* 통계 - 오른쪽 빈 공간 */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-sub)' }}>
          전체 <strong style={{ color: 'var(--color-text-main)' }}>{total}</strong>건
        </span>
        <span style={{ fontSize: '13px', color: 'var(--color-success)' }}>
          성공 <strong>{successCount}</strong>건
        </span>
        <span style={{ fontSize: '13px', color: 'var(--color-danger)' }}>
          실패 <strong>{failCount}</strong>건
        </span>
      </div>
    </SearchRow>
    <SearchRow label="검색">
      <input
        type="text"
        className="form-input"
        placeholder="수신자 / 견적번호 / 회사명 검색"
        value={searchInput}
        onChange={(e) => onSearchInputChange(e.target.value)}
        onKeyDown={onSearchKeyDown}
        style={{ width: '300px' }}
      />
      <Button variant="secondary" onClick={onSearch}>검색</Button>
      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
        {resultCount}건 표시 중
      </span>
    </SearchRow>
  </SearchPanel>
)

export default HistoryFilter
