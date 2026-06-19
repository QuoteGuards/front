const ExcelGrid = ({ rows, config, activeCell, onCellClick }) => {
  const { colLetters, colWidths, headerRow, sectionRows, summaryRows } = config

  return (
    <div className="overflow-auto" style={{ maxHeight: '340px' }}>
      <table className="border-collapse text-xs font-mono select-none">
        <thead>
          <tr>
            <th
              className="sticky top-0 left-0 z-20 bg-[#f3f2f1] border border-gray-300 text-gray-400 text-center"
              style={{ minWidth: '36px', width: '36px' }}
            />
            {colLetters.map((c, ci) => (
              <th
                key={c}
                className="sticky top-0 z-10 bg-[#f3f2f1] border border-gray-300 text-center text-gray-500 font-medium py-0.5 px-1"
                style={{ minWidth: colWidths[ci] ? undefined : '80px' }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const isHeader = ri === headerRow
            const isSection = sectionRows.includes(ri)
            const isSummary = summaryRows.includes(ri)
            const isLastSummary = ri === rows.length - 1 && summaryRows.includes(ri)
            return (
              <tr key={ri}>
                <td className="sticky left-0 z-10 bg-[#f3f2f1] border border-gray-300 text-center text-gray-400 font-medium px-1 py-0.5">
                  {ri + 1}
                </td>
                {colLetters.map((_, ci) => {
                  const cellKey = `${ri}-${ci}`
                  const isActive = activeCell === cellKey
                  const val = row[ci] ?? ''
                  const isEmpty = val === '' || val === null || val === undefined
                  let cellCls =
                    'border border-gray-200 px-2 py-[3px] cursor-pointer transition-colors whitespace-nowrap overflow-hidden text-ellipsis'
                  if (isActive) {
                    cellCls += ' outline outline-2 outline-[#1565c0] outline-offset-[-2px] bg-blue-50'
                  } else if (isHeader) {
                    cellCls += ' bg-[#e2efda] font-semibold text-gray-700'
                  } else if (isSection) {
                    cellCls += ' bg-[#fff2cc] font-semibold text-gray-700'
                  } else if (isLastSummary) {
                    cellCls += ' bg-[#e2efda] font-bold text-gray-800'
                  } else if (isSummary && ci >= colLetters.length - 2) {
                    cellCls += ' bg-[#f3f2f1] text-gray-700'
                  } else {
                    cellCls += ' bg-white text-gray-700 hover:bg-blue-50'
                  }
                  return (
                    <td
                      key={ci}
                      className={cellCls}
                      style={{ maxWidth: colWidths[ci] ? undefined : '200px' }}
                      onClick={() => onCellClick(cellKey, val)}
                    >
                      {isEmpty ? ' ' : String(val)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ExcelGrid
