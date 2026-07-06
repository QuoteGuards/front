import './DataTable.css'

/**
 * @param {Array<{key, title, render?, align?}>} columns
 * @param {Array<object>} data
 * @param {string} rowKey - data 항목에서 고유 키로 사용할 필드명
 * @param {boolean} [loading]
 * @param {string} [emptyText]
 * @param {function} [onRowClick]
 * @param {function} [rowClassName] - (row) => string, 행마다 추가로 붙일 클래스명 (선택)
 */
const DataTable = ({
  columns = [],
  data = [],
  rowKey = 'id',
  loading = false,
  emptyText = '데이터가 없습니다.',
  onRowClick,
  rowClassName,
}) => {
  const colCount = columns.length

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead className="data-table__head">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={['data-table__th', col.align ? `data-table__th--${col.align}` : ''].join(' ')}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="data-table__body">
          {loading ? (
            <tr>
              <td colSpan={colCount} className="data-table__empty">
                불러오는 중...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="data-table__empty">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row[rowKey]}
                className={[
                  'data-table__row',
                  onRowClick ? 'data-table__row--clickable' : '',
                  rowClassName ? rowClassName(row) : '',
                ].filter(Boolean).join(' ')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') onRowClick(row)
                } : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={['data-table__td', col.align ? `data-table__td--${col.align}` : ''].join(' ')}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
