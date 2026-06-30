import { useState } from 'react'
import { sendQuoteEmail } from '../../api/quoteApi'

const EmailModal = ({
  quote, 
  onClose, 
  onSent 
}) => {

  const [form, setForm] = useState({
    to: quote.buyer.email,
    cc: '',
    subject: `[견적서] ${quote.id} - ${quote.seller.companyName}`,
    body: `안녕하세요, ${quote.buyer.contactName}님.\n\n${quote.seller.companyName}에서 견적서를 첨부하여 발송드립니다.\n문의 사항이 있으시면 언제든지 연락 주시기 바랍니다.\n\n감사합니다.\n${quote.seller.companyName} 드림`,
    attachPdf: true,
  })

  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const handleSend = async () => {
    setSending(true)
    setError(null)

    try {
      await sendQuoteEmail(quote.id, form)
      onSent(form)
    } catch (e) {
      console.error('이메일 발송 실패:', e)
      setError(e?.response?.data?.message ?? '이메일 발송 중 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setSending(false)
    }
  }

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">이메일 발송</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            &times;
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">받는 사람 *</label>
            <input
              type="email"
              value={form.to}
              onChange={set('to')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">참조 (CC)</label>
            <input
              type="email"
              value={form.cc}
              onChange={set('cc')}
              placeholder="선택 사항"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">제목 *</label>
            <input
              type="text"
              value={form.subject}
              onChange={set('subject')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            
            <label className="block text-xs font-semibold text-gray-500 mb-1">본문</label>
            <textarea
              value={form.body}
              onChange={set('body')}
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.attachPdf}
              onChange={(e) => setForm((prev) => ({ ...prev, attachPdf: e.target.checked }))}
              className="w-4 h-4 accent-violet-600"
            />
            <span className="text-sm text-gray-600">견적서 PDF 첨부</span>
          </label>
        </div>

        <div className="px-6 pb-5 flex flex-col gap-2">
          <div className="flex justify-end gap-2">
            
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

          {error && <p className="text-xs text-red-500 text-right">{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default EmailModal
