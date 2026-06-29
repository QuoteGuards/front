import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuote } from '../../hooks/useQuote'
import { downloadQuotePdf } from '../../api/quoteApi'
import QuoteDocument from '../../components/quote/QuoteDocument'
import QuoteActionBar from '../../components/quote/QuoteActionBar'
import EmailModal from '../../components/quote/EmailModal'
import Toast from '../../components/common/Toast'
import PageHeader from '../../components/common/PageHeader'

const QuotePreviewPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { quote, loading, error } = useQuote(id)

  const [emailOpen, setEmailOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handlePdfDownload = async () => {
    setPdfLoading(true)
    try {
      await downloadQuotePdf(quote)
    } catch {
      showToast('PDF 다운로드 중 오류가 발생했습니다.', 'error')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleEmailSent = (form) => {
    setEmailOpen(false)
    showToast(`이메일이 ${form.to}(으)로 발송되었습니다.`)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-400 text-sm">견적서를 불러오는 중...</p>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-red-400 text-sm">견적서를 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <PageHeader breadcrumbs={['견적 관리', '견적 미리보기']} />
      <div className="no-print flex items-center justify-between px-8 pt-8 pb-4">
        <h1 className="text-xl font-bold text-gray-800">견적서 상세 및 미리보기</h1>
        <span className="text-sm text-gray-400">견적번호: {quote.id}</span>
      </div>

      <QuoteActionBar
        onPdfDownload={handlePdfDownload}
        onExcelDownload={() => navigate(`/quotes/${id}/excel`)}
        onEmailOpen={() => setEmailOpen(true)}
        pdfLoading={pdfLoading}
      />

      <div className="px-8 pb-10">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <QuoteDocument quote={quote} />
        </div>
      </div>

      {emailOpen && (
        <EmailModal
          quote={quote}
          onClose={() => setEmailOpen(false)}
          onSent={handleEmailSent}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default QuotePreviewPage
