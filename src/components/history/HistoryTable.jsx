const StatusBadge = ({ status }) => {
  const isSuccess = status === '성공'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 500,
      background: isSuccess ? '#ECFDF5' : '#FEF2F2',
      color: isSuccess ? 'var(--color-success)' : 'var(--color-danger)',
    }}>
      {isSuccess ? '✓' : '✗'} {status}
    </span>
  )
}

const HistoryTable = ({ rows }) => (
  <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-white)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
    <table className="w-full" style={{ fontSize: '13px', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: 'var(--color-bg-main)', borderBottom: '1px solid var(--color-border)' }}>
          {['발송일시', '견적번호', '구매처', '수신자', '제목', '상태'].map((h) => (
            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={6} style={{ textAlign: 'center', padding: '64px 16px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              발송 이력이 없습니다.
            </td>
          </tr>
        ) : (
          rows.map((h) => (
            <tr key={h.id} style={{ borderTop: '1px solid var(--color-border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-main)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td style={{ padding: '10px 16px', color: 'var(--color-text-sub)', whiteSpace: 'nowrap', fontSize: '12px' }}>{h.sentAt}</td>
              <td style={{ padding: '10px 16px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', background: 'var(--color-bg-main)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-sub)' }}>
                  #{h.quoteId}
                </span>
              </td>
              <td style={{ padding: '10px 16px', color: 'var(--color-text-main)', whiteSpace: 'nowrap' }}>{h.buyer}</td>
              <td style={{ padding: '10px 16px', color: 'var(--color-text-sub)', fontSize: '12px' }}>{h.to}</td>
                            <td style={{ padding: '10px 16px', color: 'var(--color-text-main)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.subject}</td>
              <td style={{ padding: '10px 16px' }}><StatusBadge status={h.status} /></td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
)

export default HistoryTable
