import ExcelGrid from './ExcelGrid'
import { SHEET_CONFIGS } from '../../constants/excelConfig'
import { useExcelPreview } from '../../hooks/useExcelPreview'

const ExcelPreview = ({ sheets, fileName }) => {
  const {
    activeSheet,
    activeCell,
    formulaVal,
    cellAddress,
    currentConfig,
    handleCellClick,
    handleSheetChange,
  } = useExcelPreview(sheets)

  const currentRows = sheets[activeSheet]

  return (
    <div
      className="rounded-lg overflow-hidden shadow-lg border border-gray-300"
      style={{ fontFamily: 'Calibri, "맑은 고딕", sans-serif' }}
    >
      {/* 타이틀바 */}
      <div className="bg-[#217346] px-4 py-2 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-white text-xs font-medium ml-1 opacity-90">
          {fileName} — 미리보기
        </span>
      </div>

      {/* 리본 메뉴 */}
      <div className="bg-[#f3f2f1] border-b border-gray-300 px-3 py-1 flex items-center gap-1 text-xs text-gray-500">
        {['홈', '삽입', '페이지 레이아웃', '수식', '데이터'].map((t) => (
          <span key={t} className="px-2 py-0.5 hover:bg-gray-200 rounded cursor-default">{t}</span>
        ))}
      </div>

      {/* 수식 바 */}
      <div className="bg-[#f3f2f1] border-b border-gray-300 px-2 py-1 flex items-center gap-2 text-xs">
        <span className="w-12 text-center border border-gray-300 bg-white px-1.5 py-0.5 rounded text-gray-700 font-mono font-medium shrink-0">
          {cellAddress}
        </span>
        <span className="text-gray-400 font-medium shrink-0">fx</span>
        <div className="flex-1 bg-white border border-gray-300 px-2 py-0.5 text-gray-700 rounded min-h-5.5">
          {formulaVal}
        </div>
      </div>

      {/* 그리드 */}
      <ExcelGrid
        rows={currentRows}
        config={currentConfig}
        activeCell={activeCell}
        onCellClick={handleCellClick}
      />

      {/* 시트 탭 */}
      <div className="bg-[#f3f2f1] border-t border-gray-300 flex items-center">
        <div className="flex">
          {SHEET_CONFIGS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSheetChange(idx)}
              className={`px-4 py-1.5 text-xs border-r border-gray-300 transition-colors ${
                activeSheet === idx
                  ? 'bg-white text-[#217346] font-semibold border-t-2 border-t-[#217346] -mt-px'
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto pr-3">
          {currentRows.length}행 × {currentConfig.colLetters.length}열
        </span>
      </div>
    </div>
  )
}

export default ExcelPreview
