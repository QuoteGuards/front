import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import QuoteListPage from '../pages/quote/QuoteListPage'
import QuoteWritePage from '../pages/quote/QuoteWritePage'
import QuoteDetailPage from '../pages/quote/QuoteDetailPage'
import QuoteInternalAnalysisPage from '../pages/quote/QuoteInternalAnalysisPage'
import QuotePreviewPage from '../pages/quote/QuotePreviewPage'
import ExcelDownloadPage from '../pages/quote/ExcelDownloadPage'
import HistoryPage from '../pages/history/HistoryPage'
import TrainingPage from '../pages/training/TrainingPage'
import AdminApprovalPage from '../pages/approval/AdminApprovalPage'
import AdminApprovalDetailPage from '../pages/approval/AdminApprovalDetailPage'
import StaffApprovalPage from '../pages/approval/StaffApprovalPage'
import UserManagementPage from '../pages/admin/UserManagementPage'
import LoginPage from '../pages/login/LoginPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '../pages/auth/ResetPasswordPage'
import SetPasswordPage from '../pages/auth/SetPasswordPage'
import CategoryManagePage from '../pages/category/CategoryManagePage'
import ProductManagePage from '../pages/product/ProductManagePage'
import DiscountManagePage from '../pages/discount/DiscountManagePage'
import ProductSearchPage from '../pages/catalog/ProductSearchPage'
import ProductDetailPage from '../pages/catalog/ProductDetailPage'
import FavoritesPage from '../pages/catalog/FavoritesPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import MyPage from '../pages/mypage/MyPage'
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute'
import { getDefaultPath } from './routeUtils'
import ChangePasswordModal from '../components/common/ChangePasswordModal'
import { useAuth } from '../hooks/useAuth'

// AppLayout은 단일 인스턴스로 유지 - 라우트 전환 시 GNB/Sidebar 재마운트 방지
function AppLayoutRoute() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  )
}

// 역할별 기본 페이지로 이동
function DefaultRedirect() {
  const { user } = useAuth()
  return <Navigate to={getDefaultPath(user?.role)} replace />
}

export default function AppRouter() {
  const { isAuthenticated, mustChangePassword } = useAuth()
  const location = useLocation()

  return (
    <>
      {isAuthenticated && mustChangePassword && location.pathname !== '/login' && <ChangePasswordModal />}
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />

        {/* 보호 라우트 - AppLayout 단일 인스턴스 */}
        <Route element={<AppLayoutRoute />}>
          <Route index element={<DefaultRedirect />} />

          {/* 견적 - 영업사원·영업관리자 */}
          <Route path="/quotes" element={
            <ProtectedRoute roles={['SALES_STAFF', 'SALES_MANAGER']}>
              <QuoteListPage />
            </ProtectedRoute>
          } />
          <Route path="/quotes/new" element={
            <ProtectedRoute roles={['SALES_STAFF', 'SALES_MANAGER']}>
              <QuoteWritePage />
            </ProtectedRoute>
          } />
          <Route path="/quotes/:quoteId/detail" element={
            <ProtectedRoute roles={['SALES_STAFF', 'SALES_MANAGER']}>
              <QuoteDetailPage />
            </ProtectedRoute>
          } />
          <Route path="/quotes/analysis/:quoteId" element={
            <ProtectedRoute roles={['SALES_STAFF', 'SALES_MANAGER']}>
              <QuoteInternalAnalysisPage />
            </ProtectedRoute>
          } />
          <Route path="/quotes/:id/preview" element={
            <ProtectedRoute roles={['SALES_STAFF', 'SALES_MANAGER']}>
              <QuotePreviewPage />
            </ProtectedRoute>
          } />
          <Route path="/quotes/:id/excel" element={
            <ProtectedRoute roles={['SALES_STAFF', 'SALES_MANAGER']}>
              <ExcelDownloadPage />
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute roles={['SALES_STAFF', 'SALES_MANAGER']}>
              <HistoryPage />
            </ProtectedRoute>
          } />

          {/* 승인 */}
          <Route path="/admin/approval" element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'SALES_MANAGER']}>
              <AdminApprovalPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/approval/:approvalRequestId" element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'SALES_MANAGER']}>
              <AdminApprovalDetailPage />
            </ProtectedRoute>
          } />
          <Route path="/staff/approval" element={
            <ProtectedRoute roles={['SALES_STAFF']}>
              <StaffApprovalPage />
            </ProtectedRoute>
          } />

          {/* 제품 - 영업사원·영업관리자 */}
          <Route path="/catalog" element={
            <ProtectedRoute roles={['SALES_STAFF', 'SALES_MANAGER']}>
              <ProductSearchPage />
            </ProtectedRoute>
          } />
          <Route path="/catalog/favorites" element={
            <ProtectedRoute roles={['SALES_STAFF', 'SALES_MANAGER']}>
              <FavoritesPage />
            </ProtectedRoute>
          } />
          <Route path="/catalog/:productId" element={
            <ProtectedRoute roles={['SALES_STAFF', 'SALES_MANAGER']}>
              <ProductDetailPage />
            </ProtectedRoute>
          } />

          {/* 제품 관리 - 최고관리자 */}
          <Route path="/products" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <ProductManagePage />
            </ProtectedRoute>
          } />
          <Route path="/categories" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <CategoryManagePage />
            </ProtectedRoute>
          } />
          <Route path="/discounts" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <DiscountManagePage />
            </ProtectedRoute>
          } />

          {/* 통계 & 관리 */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'SALES_MANAGER']}>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <UserManagementPage />
            </ProtectedRoute>
          } />

          {/* 계정 - 전체 */}
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/my-page" element={<MyPage />} />
        </Route>

        {/* 매칭되지 않는 경로 → 루트로 리다이렉트 (보호 라우트 밖에 위치해야 무한 리다이렉트 방지) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
