import type { FlowMetric, Incident } from '../types';

interface Props {
  metrics: FlowMetric[];
  incidents: Incident[];
}

function Card({ label, value, sub, accent }: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="metric-card" style={{ borderTop: `3px solid ${accent ?? '#4f8ef7'}` }}>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

export function MetricCards({ metrics, incidents }: Props) {
  const anomalousCount = metrics.filter(m => m.anomalyScore >= 2.0).length;
  const criticalCount = incidents.filter(i => i.severity === 'CRITICAL').length;
  const highCount = incidents.filter(i => i.severity === 'HIGH').length;
  const avgLatency = metrics.length > 0
    ? (metrics.reduce((s, m) => s + m.avgLatencyMs, 0) / metrics.length).toFixed(0)
    : '—';

  return (
    <div className="metric-cards-grid">
      <Card label="Total Flows" value={metrics.length} accent="#4f8ef7" />
      <Card label="Anomalous Flows" value={anomalousCount} accent="#f7a94f" sub="Z-score ≥ 2.0" />
      <Card label="Critical Incidents" value={criticalCount} accent="#e05555" />
      <Card label="High Incidents" value={highCount} accent="#e09b25" />
      <Card label="Avg Latency" value={avgLatency === '—' ? '—' : `${avgLatency} ms`} accent="#4fc98e" />
      <Card label="Total Incidents" value={incidents.length} accent="#8b6cf7" />
    </div>
  );
}
