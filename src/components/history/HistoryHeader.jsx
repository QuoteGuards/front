import Card from '../common/Card'

function StatCard({ label, value, color }) {
  return (
    <Card style={{ padding: '16px 20px', flex: '0 0 auto' }}>
      <p style={{ fontSize: '12px', color: 'var(--color-text-sub)', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1, color: color ?? 'var(--color-text-main)' }}>
        {value}
        <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-text-sub)', marginLeft: '4px' }}>건</span>
      </p>
    </Card>
  )
}

const HistoryHeader = ({ total, successCount, failCount }) => (
  <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
    <StatCard label="전체 발송" value={total} color="var(--color-text-main)" />
    <StatCard label="성공" value={successCount} color="var(--color-success)" />
    <StatCard label="실패" value={failCount} color="var(--color-danger)" />
  </div>
)

export default HistoryHeader
