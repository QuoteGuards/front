const QuoteActionBar = ({
  onPdfDownload,
  onExcelDownload,
  onEmailOpen,
  pdfLoading,
  canSendEmail = true,
  sendBlockedMessage = '발송할 수 없는 견적입니다.',
}) => (
  <div className="no-print flex gap-3 px-8 mb-6">
    <button
      onClick={onPdfDownload}
      disabled={pdfLoading}
      className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pdfLoading ? 'PDF 생성 중...' : 'PDF 다운로드'}
    </button>
    <button
      onClick={onExcelDownload}
      className="px-5 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
    >
      엑셀 다운로드
    </button>
    {canSendEmail ? (
      <button
        onClick={onEmailOpen}
        className="px-5 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
      >
        이메일 발송
      </button>
    ) : (
      <button
        type="button"
        disabled
        title={sendBlockedMessage}
        className="px-5 py-2 text-sm font-medium rounded-lg bg-gray-200 text-gray-500 cursor-not-allowed"
      >
        이메일 발송 불가
      </button>
    )}
  </div>
)

export default QuoteActionBar
