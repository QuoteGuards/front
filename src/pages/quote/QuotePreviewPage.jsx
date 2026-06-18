import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import QuoteDocument from '../../components/quote/QuoteDocument'
import { MOCK_QUOTE } from '../../constants/mockQuote'
import { HISTORY_STORAGE_KEY } from '../../constants/mockHistory'

const EmailModal = ({ quote, onClose, onSend }) => {
  const [form, setForm] = useState({
    to: quote.buyer.email,
    cc: '',
    subject: `[견적서] ${quote.id} - ${quote.seller.companyName}`,
    body: `안녕하세요, ${quote.buyer.contactName}님.\n\n${quote.seller.companyName}에서 견적서를 첨부하여 발송드립니다.\n문의 사항이 있으시면 언제든지 연락 주시기 바랍니다.\n\n감사합니다.\n${quote.seller.companyName} 드림`,
    attachPdf: true,
  })
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)
    await new Promise((r) => setTimeout(r, 1200))
    setSending(false)
    onSend(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">이메일 발송</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">받는 사람 *</label>
            <input
              type="email"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">참조 (CC)</label>
            <input
              type="email"
              value={form.cc}
              onChange={(e) => setForm({ ...form, cc: e.target.value })}
              placeholder="선택 사항"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">제목 *</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">본문</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.attachPdf}
              onChange={(e) => setForm({ ...form, attachPdf: e.target.checked })}
              className="w-4 h-4 accent-violet-600"
            />
            <span className="text-sm text-gray-600">견적서 PDF 첨부</span>
          </label>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            disabled={!form.to || !form.subject || sending}
            onClick={handleSend}
            className="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? '발송 중...' : '발송'}
          </button>
        </div>
      </div>
    </div>
  )
}

const Toast = ({ message, onClose }) => (
  <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3">
    <span>✅</span>
    <span className="text-sm font-medium">{message}</span>
    <button
      onClick={onClose}
      className="text-emerald-200 hover:text-white ml-2 text-lg leading-none"
    >
      &times;
    </button>
  </div>
)

const now = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const saveToHistory = (quote, form) => {
  const prev = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]')
  const entry = {
    id: `EH-${Date.now()}`,
    sentAt: now(),
    quoteId: quote.id,
    buyer: quote.buyer.companyName,
    to: form.to,
    cc: form.cc,
    subject: form.subject,
    attachPdf: form.attachPdf,
    status: '성공',
  }
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([entry, ...prev]))
}

const QuotePreviewPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [emailOpen, setEmailOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const quote = MOCK_QUOTE

  const handlePrint = () => window.print()

  const handleEmailSent = (form) => {
    saveToHistory(quote, form)
    setEmailOpen(false)
    setToast(`이메일이 ${form.to}(으)로 발송되었습니다.`)
    setTimeout(() => setToast(null), 4000)
  }

  const handleExcelDownload = () => {
    navigate(`/quotes/${quote.id}/excel`)
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* 페이지 헤더 */}
      <div className="no-print flex items-center justify-between px-8 pt-8 pb-4">
        <h1 className="text-xl font-bold text-gray-800">견적서 상세 및 미리보기</h1>
        <span className="text-sm text-gray-400">견적번호: {quote.id}</span>
      </div>

      {/* 액션 버튼 */}
      <div className="no-print flex gap-3 px-8 mb-6">
        <button
          onClick={handlePrint}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          PDF 다운로드
        </button>

        <button
          onClick={handleExcelDownload}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
        >
          엑셀 다운로드
        </button>

        <button
          onClick={() => setEmailOpen(true)}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
        >
          이메일 발송
        </button>
      </div>

      {/* 견적서 문서 카드 */}
      <div className="px-8 pb-10">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <QuoteDocument quote={quote} />
        </div>
      </div>

      {emailOpen && (
        <EmailModal
          quote={quote}
          onClose={() => setEmailOpen(false)}
          onSend={handleEmailSent}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

export default QuotePreviewPage
