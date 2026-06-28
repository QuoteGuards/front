import { useState, useEffect } from 'react'
import Button from '../../components/common/Button'
import UserCreateModal from '../../components/admin/UserCreateModal'
import { getUserListApi, suspendUserApi, reactivateUserApi } from '../../api/userManagementApi'

const STATUS_LABEL = {
  APPROVED: '활성',
  PENDING: '승인 대기',
  SUSPENDED: '정지',
  REJECTED: '반려',
}
const STATUS_CLASS = {
  APPROVED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-yellow-50 text-yellow-700',
  SUSPENDED: 'bg-red-50 text-red-600',
  REJECTED: 'bg-gray-100 text-gray-500',
}
const ROLE_LABEL = {
  SUPER_ADMIN: '최고 관리자',
  SALES_MANAGER: '영업 관리자',
  SALES_STAFF: '영업 사원',
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  // refetch 카운터: increment 시 useEffect가 재실행됨
  const [fetchTick, setFetchTick] = useState(0)

  const refetch = () => setFetchTick((t) => t + 1)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await getUserListApi({
          keyword,
          status: statusFilter || undefined,
          page,
          size: 20,
        })
        if (!cancelled) {
          setUsers(res.data?.content ?? [])
          setTotalPages(res.data?.totalPages ?? 0)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? '사용자 목록을 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [keyword, statusFilter, page, fetchTick])

  const handleToggleStatus = async (user) => {
    const isSuspended = user.status === 'SUSPENDED'
    setActionLoading(user.id)
    try {
      if (isSuspended) {
        await reactivateUserApi(user.id)
      } else {
        await suspendUserApi(user.id)
      }
      refetch()
    } catch (err) {
      alert(err?.response?.data?.message ?? '처리에 실패했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-800">사용자 관리</h1>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          icon={
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          }
        >
          계정 생성
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="search"
          placeholder="이름 또는 이메일 검색"
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(0) }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="사용자 검색"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="상태 필터"
        >
          <option value="">전체 상태</option>
          <option value="APPROVED">활성</option>
          <option value="PENDING">승인 대기</option>
          <option value="SUSPENDED">정지</option>
        </select>
      </div>

      {/* 에러 */}
      {error && (
        <div role="alert" className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* 테이블 */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">사용자가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-left px-4 py-3 font-medium">이름</th>
                <th className="text-left px-4 py-3 font-medium">사원번호</th>
                <th className="text-left px-4 py-3 font-medium">이메일</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">부서 / 직급</th>
                <th className="text-left px-4 py-3 font-medium">권한</th>
                <th className="text-left px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.memberNumber ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600 truncate max-w-[180px]" title={u.email}>{u.email}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {[u.department, u.position].filter(Boolean).join(' / ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[u.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABEL[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(u.status === 'APPROVED' || u.status === 'SUSPENDED') && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        disabled={actionLoading === u.id}
                        className={[
                          'text-xs px-2.5 py-1 rounded-md font-medium transition-colors disabled:opacity-50',
                          u.status === 'SUSPENDED'
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-red-600 bg-red-50 hover:bg-red-100',
                        ].join(' ')}
                      >
                        {actionLoading === u.id ? '...' : u.status === 'SUSPENDED' ? '재활성화' : '정지'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            이전
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">{page + 1} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}

      {/* 계정 생성 모달 */}
      {showCreateModal && (
        <UserCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={refetch}
        />
      )}
    </div>
  )
}
