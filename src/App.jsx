import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/common/Sidebar'
import QuotePreviewPage from './pages/quote/QuotePreviewPage'

const Layout = ({ children }) => (
  <div className="flex min-h-screen">
    <Sidebar />
    <main className="flex-1">{children}</main>
  </div>
)

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/quotes/QT-2026-00123/preview" replace />} />
      <Route
        path="/quotes/:id/preview"
        element={<Layout><QuotePreviewPage /></Layout>}
      />
      <Route path="/quotes" element={<Layout><QuotePreviewPage /></Layout>} />
      <Route path="/quotes/new" element={<Layout><div className="p-8 text-gray-400">견적 작성 페이지 (준비 중)</div></Layout>} />
      <Route path="/analysis" element={<Layout><div className="p-8 text-gray-400">내부 견적 분석 (준비 중)</div></Layout>} />
      <Route path="/products" element={<Layout><div className="p-8 text-gray-400">제품 담당 (준비 중)</div></Layout>} />
      <Route path="/history" element={<Layout><div className="p-8 text-gray-400">발송 이력 (준비 중)</div></Layout>} />
    </Routes>
  </BrowserRouter>
)

export default App
