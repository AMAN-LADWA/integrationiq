import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import type { FlowMetric } from '../types';

interface Props {
  metrics: FlowMetric[];
}

const ANOMALY_COLOR = '#f7a94f';
const NORMAL_COLOR = '#4f8ef7';
const CRITICAL_COLOR = '#e05555';

export function LatencyChart({ metrics }: Props) {
  if (metrics.length === 0) {
    return (
      <div className="panel">
        <h2 className="panel-title">Latency by Flow</h2>
        <p className="empty-state">No data to display.</p>
      </div>
    );
  }

  const data = [...metrics]
    .sort((a, b) => b.avgLatencyMs - a.avgLatencyMs)
    .slice(0, 20)
    .map(m => ({
      name: m.flowName.length > 20 ? m.flowName.substring(0, 18) + '…' : m.flowName,
      fullName: m.flowName,
      latency: Math.round(m.avgLatencyMs),
      anomalyScore: m.anomalyScore,
    }));

  const avgLatency = data.reduce((s, d) => s + d.latency, 0) / data.length;

  const getColor = (score: number) => {
    if (score >= 3.0) return CRITICAL_COLOR;
    if (score >= 2.0) return ANOMALY_COLOR;
    return NORMAL_COLOR;
  };

  return (
    <div className="panel">
      <h2 className="panel-title">Latency by Flow <span className="chart-subtitle">(top 20 by latency)</span></h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: '#1e2330', border: '1px solid #2a2f3e', color: '#e2e8f0' }}
            formatter={(value: number, _: string, props: { payload?: { fullName?: string } }) => [
              `${value} ms`,
              props.payload?.fullName ?? '',
            ]}
          />
          <ReferenceLine y={avgLatency} stroke="#4fc98e" strokeDasharray="4 2"
            label={{ value: `avg ${avgLatency.toFixed(0)}ms`, fill: '#4fc98e', fontSize: 10 }} />
          <Bar dataKey="latency" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getColor(entry.anomalyScore)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span><span className="legend-dot" style={{ background: NORMAL_COLOR }} /> Normal</span>
        <span><span className="legend-dot" style={{ background: ANOMALY_COLOR }} /> Anomalous</span>
        <span><span className="legend-dot" style={{ background: CRITICAL_COLOR }} /> Critical</span>
        <span><span className="legend-dot" style={{ background: '#4fc98e' }} /> Average</span>
      </div>
    </div>
  );
}
