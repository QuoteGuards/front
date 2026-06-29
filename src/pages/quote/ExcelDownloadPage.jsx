import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuote } from '../../hooks/useQuote'
import { downloadQuoteExcel } from '../../utils/excelExport'
import { buildSheets } from '../../utils/excelSheetBuilder'
import ExcelPreview from '../../components/excel/ExcelPreview'
import PageHeader from '../../components/common/PageHeader'

const ExcelDownloadPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { quote, loading, error } = useQuote(id)

  const [downloading, setDownloading] = useState(false)
  const [done, setDone] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    await new Promise((r) => setTimeout(r, 300))
    downloadQuoteExcel(quote)
    setDownloading(false)
    setDone(true)
    setTimeout(() => setDone(false), 3000)
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

  const fileName = `견적서_${quote.id}_${quote.createdAt}.xlsx`

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <PageHeader breadcrumbs={['견적 관리', '엑셀 다운로드']} />
      <div className="px-8 pt-8 pb-5 border-b border-gray-200 bg-white">
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1 transition-colors"
        >
          ← 돌아가기
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">엑셀 다운로드</h1>
            <p className="text-sm text-gray-400 mt-1">
              견적번호&nbsp;
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{quote.id}</span>
              &nbsp;· 파일명:&nbsp;
              <span className="text-gray-500">{fileName}</span>
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {downloading ? '생성 중...' : done ? '✓ 다운로드 완료' : '⬇ 엑셀 다운로드'}
          </button>
        </div>
      </div>

      <div className="px-8 py-6">
        <ExcelPreview sheets={buildSheets(quote)} fileName={fileName} />

        <div className="mt-3 flex gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#e2efda] border border-gray-300 inline-block" />
            헤더 / 합계
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#fff2cc] border border-gray-300 inline-block" />
            섹션 구분
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white border border-gray-300 inline-block" />
            데이터 셀
          </span>
        </div>
      </div>
    </div>
  )
}

export default ExcelDownloadPage
