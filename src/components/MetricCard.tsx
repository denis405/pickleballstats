type MetricCardProps = {
  label: string
  value: string | number
  tone?: 'teal' | 'gold' | 'red'
}

export function MetricCard({ label, value, tone = 'teal' }: MetricCardProps) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}
