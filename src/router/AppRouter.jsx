import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from '../components/common/Sidebar'
import QuoteListPage from '../pages/quote/QuoteListPage'
import QuoteWritePage from '../pages/quote/QuoteWritePage'
import QuoteDetailPage from '../pages/quote/QuoteDetailPage'
import QuoteInternalAnalysisPage from '../pages/quote/QuoteInternalAnalysisPage'
import QuotePreviewPage from '../pages/quote/QuotePreviewPage'
import ExcelDownloadPage from '../pages/quote/ExcelDownloadPage'
import HistoryPage from '../pages/history/HistoryPage'
import TrainingPage from '../pages/training/TrainingPage'
import AdminApprovalPage from '../pages/approval/AdminApprovalPage'
import StaffApprovalPage from '../pages/approval/StaffApprovalPage'
import UserManagementPage from '../pages/admin/UserManagementPage'
import LoginPage from '../pages/login/LoginPage'
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute'
import ChangePasswordModal from '../components/common/ChangePasswordModal'
import { useAuth } from '../hooks/useAuth'

const Layout = ({ children }) => (
  <div className="flex min-h-screen">
    <Sidebar />
    <main className="flex-1">{children}</main>
  </div>
)

export default function AppRouter() {
  const { isAuthenticated, mustChangePassword } = useAuth()
  const location = useLocation()

  return (
    <>
      {isAuthenticated && mustChangePassword && location.pathname !== '/login' && <ChangePasswordModal />}
      <Routes>
      {/* 공개 라우트 */}
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />

      {/* 보호 라우트 */}
      <Route path="/" element={<ProtectedRoute><Navigate to="/quotes" replace /></ProtectedRoute>} />
      <Route path="/training" element={<ProtectedRoute><Layout><TrainingPage /></Layout></ProtectedRoute>} />
      <Route path="/quotes" element={<ProtectedRoute><Layout><QuoteListPage /></Layout></ProtectedRoute>} />
      <Route path="/quotes/new" element={<ProtectedRoute><Layout><QuoteWritePage /></Layout></ProtectedRoute>} />
      <Route path="/quotes/:quoteId/detail" element={<ProtectedRoute><Layout><QuoteDetailPage /></Layout></ProtectedRoute>} />
      <Route path="/quotes/analysis/:quoteId" element={<ProtectedRoute><Layout><QuoteInternalAnalysisPage /></Layout></ProtectedRoute>} />
      <Route path="/quotes/:id/preview" element={<ProtectedRoute><Layout><QuotePreviewPage /></Layout></ProtectedRoute>} />
      <Route path="/quotes/:id/excel" element={<ProtectedRoute><Layout><ExcelDownloadPage /></Layout></ProtectedRoute>} />
      <Route path="/analysis" element={<ProtectedRoute><Layout><div className="p-8 text-gray-400">내부 견적 분석 (준비 중)</div></Layout></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Layout><div className="p-8 text-gray-400">제품 담당 (준비 중)</div></Layout></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><Layout><HistoryPage /></Layout></ProtectedRoute>} />
      <Route path="/admin/approval" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SALES_MANAGER']}><Layout><AdminApprovalPage /></Layout></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={['SUPER_ADMIN']}><Layout><UserManagementPage /></Layout></ProtectedRoute>} />
      <Route path="/staff/approval" element={<ProtectedRoute roles={['SALES_STAFF']}><Layout><StaffApprovalPage /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
