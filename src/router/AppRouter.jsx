import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from '../components/common/Sidebar'
import QuoteListPage from '../pages/quote/QuoteListPage'
import QuotePreviewPage from '../pages/quote/QuotePreviewPage'
import ExcelDownloadPage from '../pages/quote/ExcelDownloadPage'
import HistoryPage from '../pages/history/HistoryPage'
import LoginPage from '../pages/login/LoginPage'
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute'

const Layout = ({ children }) => (
  <div className="flex min-h-screen">
    <Sidebar />
    <main className="flex-1">{children}</main>
  </div>
)

export default function AppRouter() {
  return (
    <Routes>
      {/* 공개 라우트 */}
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />

      {/* 보호 라우트 */}
      <Route path="/" element={<ProtectedRoute><Navigate to="/quotes" replace /></ProtectedRoute>} />
      <Route path="/quotes" element={<ProtectedRoute><Layout><QuoteListPage /></Layout></ProtectedRoute>} />
      <Route path="/quotes/new" element={<ProtectedRoute><Layout><div className="p-8 text-gray-400">견적 작성 페이지 (준비 중)</div></Layout></ProtectedRoute>} />
      <Route path="/quotes/:id/preview" element={<ProtectedRoute><Layout><QuotePreviewPage /></Layout></ProtectedRoute>} />
      <Route path="/quotes/:id/excel" element={<ProtectedRoute><Layout><ExcelDownloadPage /></Layout></ProtectedRoute>} />
      <Route path="/analysis" element={<ProtectedRoute><Layout><div className="p-8 text-gray-400">내부 견적 분석 (준비 중)</div></Layout></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Layout><div className="p-8 text-gray-400">제품 담당 (준비 중)</div></Layout></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><Layout><HistoryPage /></Layout></ProtectedRoute>} />

      {/* 정의되지 않은 경로 → 홈으로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
