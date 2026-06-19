import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/common/Sidebar'
import QuotePreviewPage from './pages/quote/QuotePreviewPage'
import QuoteListPage from './pages/quote/QuoteListPage'
import ExcelDownloadPage from './pages/quote/ExcelDownloadPage'
import HistoryPage from './pages/history/HistoryPage'

const Layout = ({ children }) => (
  <div className="flex min-h-screen">
    <Sidebar />
    <main className="flex-1">{children}</main>
  </div>
)

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/quotes" replace />} />
      <Route path="/quotes" element={<Layout><QuoteListPage /></Layout>} />
      <Route path="/quotes/new" element={<Layout><div className="p-8 text-gray-400">견적 작성 페이지 (준비 중)</div></Layout>} />
      <Route path="/quotes/:id/preview" element={<Layout><QuotePreviewPage /></Layout>} />
      <Route path="/quotes/:id/excel" element={<Layout><ExcelDownloadPage /></Layout>} />
      <Route path="/analysis" element={<Layout><div className="p-8 text-gray-400">내부 견적 분석 (준비 중)</div></Layout>} />
      <Route path="/products" element={<Layout><div className="p-8 text-gray-400">제품 담당 (준비 중)</div></Layout>} />
      <Route path="/history" element={<Layout><HistoryPage /></Layout>} />
    </Routes>
  </BrowserRouter>
)

export default App
