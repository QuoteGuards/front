import { useState } from 'react'
import { SHEET_CONFIGS } from '../constants/excelConfig'

export const useExcelPreview = (sheets) => {
  const [activeSheet, setActiveSheet] = useState(0)
  const [activeCell, setActiveCell] = useState('0-0')
  const [formulaVal, setFormulaVal] = useState(() => String(sheets?.[0]?.[0]?.[0] ?? ''))

  const handleCellClick = (key, val) => {
    setActiveCell(key)
    setFormulaVal(val === '' ? '' : String(val))
  }

  const handleSheetChange = (idx) => {
    setActiveSheet(idx)
    setActiveCell('0-0')
    if (sheets) setFormulaVal(sheets[idx]?.[0]?.[0] ?? '')
  }

  const currentConfig = SHEET_CONFIGS[activeSheet]
  const cellAddress = (() => {
    const [ri, ci] = activeCell.split('-').map(Number)
    return `${currentConfig.colLetters[ci] ?? 'A'}${ri + 1}`
  })()

  return {
    activeSheet,
    activeCell,
    formulaVal,
    cellAddress,
    currentConfig,
    handleCellClick,
    handleSheetChange,
  }
}
