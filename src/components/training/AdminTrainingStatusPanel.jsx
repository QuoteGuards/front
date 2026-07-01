import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DataTable from '../common/DataTable'
import SearchPanel, { SearchRow } from '../common/SearchPanel'
import SegmentedControl from '../common/SegmentedControl'
import Button from '../common/Button'
import TrainingStatusBadge from './TrainingStatusBadge'
import { getAdminTrainingStatusListApi } from '../../api/adminTrainingApi'
import { TRAINING_STATUS_LABEL } from '../../constants/training'
import { downloadTableExcel } from '../../utils/excelExport'

const STATUS_FILTER_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'NOT_STARTED', label: '미시작' },
  { value: 'IN_PROGRESS', label: '진행중' },
  { value: 'COMPLETED', label: '이수완료' },
]

const fmtDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fmtDuration = (seconds) => {
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function AdminTrainingStatusDetailModal({ row, onClose }) {
  if (!row) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">교육 이수 상세</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none" aria-label="닫기">&times;</button>
        </div>
        <dl className="px-6 py-5 grid grid-cols-[120px_1fr] gap-y-3 text-sm">
          <dt className="text-gray-500">이름</dt><dd className="text-gray-800 font-medium">{row.userName}</dd>
          <dt className="text-gray-500">이메일</dt><dd className="text-gray-800 break-all">{row.email}</dd>
          <dt className="text-gray-500">부서</dt><dd>{row.department || '-'}</dd>
          <dt className="text-gray-500">교육명</dt><dd className="text-gray-800">{row.trainingTitle || '-'}</dd>
          <dt className="text-gray-500">교육 상태</dt><dd>{TRAINING_STATUS_LABEL[row.status] ?? row.status}</dd>
          <dt className="text-gray-500">가이드 확인</dt><dd>{row.guideConfirmed ? '완료' : '미완료'}</dd>
          <dt className="text-gray-500">시청률</dt><dd>{Number(row.progressRate).toFixed(1)}%</dd>
          <dt className="text-gray-500">시청 시간</dt><dd>{fmtDuration(row.watchedSeconds)}</dd>
          <dt className="text-gray-500">이수 완료 시간</dt><dd>{fmtDate(row.completedAt)}</dd>
        </dl>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>닫기</Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminTrainingStatusPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [onlyIncomplete, setOnlyIncomplete] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)
  const requestIdRef = useRef(0)

  const fetchRows = useCallback((requestId) => {
    return getAdminTrainingStatusListApi()
      .then((data) => {
        if (requestIdRef.current === requestId) setRows(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (requestIdRef.current === requestId) {
          setError(err.response?.data?.message ?? '교육 이수 현황을 불러오지 못했습니다.')
        }
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setLoading(false)
      })
  }, [])

  const loadRows = useCallback(() => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError('')
    return fetchRows(requestId)
  }, [fetchRows])

  useEffect(() => {
    const requestId = ++requestIdRef.current
    fetchRows(requestId)
  }, [fetchRows])

  const departmentOptions = useMemo(() => {
    const set = new Set(rows.map((row) => row.department).filter(Boolean))
    return [{ value: '', label: '전체' }, ...[...set].sort().map((d) => ({ value: d, label: d }))]
  }, [rows])

  const filteredRows = useMemo(() => {
    const keyword = appliedKeyword.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false
      if (departmentFilter && row.department !== departmentFilter) return false
      if (onlyIncomplete && row.fullyCompleted) return false
      if (!keyword) return true
      return (
        String(row.userName ?? '').toLowerCase().includes(keyword)
        || String(row.email ?? '').toLowerCase().includes(keyword)
        || String(row.memberNumber ?? '').toLowerCase().includes(keyword)
      )
    })
  }, [rows, statusFilter, departmentFilter, appliedKeyword, onlyIncomplete])

  const incompleteCount = useMemo(
    () => rows.filter((row) => !row.fullyCompleted).length,
    [rows]
  )

  const handleExportExcel = () => {
    const headers = ['이름', '이메일', '부서', '교육명', '교육 상태', '가이드 확인', '시청률(%)', '시청 시간', '이수 완료 시간']
    const dataRows = filteredRows.map((row) => [
      row.userName,
      row.email,
      row.department || '',
      row.trainingTitle || '',
      TRAINING_STATUS_LABEL[row.status] ?? row.status,
      row.guideConfirmed ? '완료' : '미완료',
      Number(row.progressRate ?? 0).toFixed(1),
      fmtDuration(row.watchedSeconds),
      row.completedAt ? fmtDate(row.completedAt) : '-',
    ])

    downloadTableExcel({
      headers,
      rows: dataRows,
      sheetName: '교육 이수 현황',
      fileName: `교육이수현황_${new Date().toISOString().slice(0, 10)}`,
    })
  }

  const columns = [
    { key: 'userName', title: '이름' },
    { key: 'email', title: '이메일' },
    { key: 'department', title: '부서', render: (val) => val || '-' },
    { key: 'trainingTitle', title: '교육명', render: (val) => val || '-' },
    {
      key: 'status',
      title: '교육 상태',
      align: 'center',
      render: (val) => <TrainingStatusBadge status={val} />,
    },
    {
      key: 'progressRate',
      title: '시청률',
      align: 'right',
      render: (val) => `${Number(val ?? 0).toFixed(1)}%`,
    },
    {
      key: 'watchedSeconds',
      title: '시청 시간',
      align: 'right',
      render: (val) => fmtDuration(val),
    },
    {
      key: 'completedAt',
      title: '이수 완료 시간',
      render: (val) => fmtDate(val),
    },
    {
      key: 'actions',
      title: '상세 보기',
      align: 'center',
      width: '96px',
      render: (_, row) => (
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedRow(row) }}>
          상세 보기
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-semibold mb-1">미이수자 {incompleteCount}명</p>
        <p className="text-xs text-amber-700">
          영상 80% 이상 시청과 가이드 확인을 모두 완료해야 견적 작성이 가능합니다.
        </p>
      </div>

      <SearchPanel>
        <SearchRow label="교육 상태">
          <SegmentedControl
            variant="pills"
            name="training-status-filter"
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </SearchRow>
        <SearchRow label="부서">
          <select
            className="form-select"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{ width: '180px' }}
          >
            {departmentOptions.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </SearchRow>
        <SearchRow label="영업사원 검색">
          <input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setAppliedKeyword(inputValue)}
            placeholder="이름, 이메일, 사원번호"
            className="form-input"
            style={{ width: '260px' }}
          />
          <Button variant="secondary" onClick={() => setAppliedKeyword(inputValue)}>검색</Button>
        </SearchRow>
        <SearchRow label="표시">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-sub)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyIncomplete}
              onChange={(e) => setOnlyIncomplete(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-primary)]"
            />
            미이수자만 보기
          </label>
        </SearchRow>
      </SearchPanel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">총 {filteredRows.length}건</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadRows} disabled={loading}>새로고침</Button>
          <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={loading || filteredRows.length === 0}>
            엑셀 다운로드
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        data={filteredRows}
        rowKey="userId"
        loading={loading}
        emptyText="조건에 맞는 교육 이수 현황이 없습니다."
      />

      {selectedRow && (
        <AdminTrainingStatusDetailModal
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </div>
  )
}
