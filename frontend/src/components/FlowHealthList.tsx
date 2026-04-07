import type { FlowMetric } from '../types';

interface Props {
  metrics: FlowMetric[];
}

function HealthBadge({ score }: { score: number }) {
  if (score >= 3.0) return <span className="badge badge-critical">Critical</span>;
  if (score >= 2.0) return <span className="badge badge-high">Anomalous</span>;
  return <span className="badge badge-ok">Healthy</span>;
}

export function FlowHealthList({ metrics }: Props) {
  const sorted = [...metrics].sort((a, b) => b.anomalyScore - a.anomalyScore);

  if (sorted.length === 0) {
    return (
      <div className="panel">
        <h2 className="panel-title">Flow Health</h2>
        <p className="empty-state">No flow data. Trigger an analysis to begin.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Flow Health <span className="count-badge">{sorted.length}</span></h2>
      <div className="flow-table-wrapper">
        <table className="flow-table">
          <thead>
            <tr>
              <th>Flow Name</th>
              <th>Tenant</th>
              <th>Avg Latency</th>
              <th>Error Rate</th>
              <th>Messages</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => {
              const total = Object.values(m.statusCounts).reduce((s, v) => s + v, 0);
              return (
                <tr key={`${m.flowName}|${m.anonymisedTenant}`}
                    className={m.anomalyScore >= 2.0 ? 'row-anomalous' : ''}>
                  <td className="flow-name">{m.flowName}</td>
                  <td className="tenant">{m.anonymisedTenant}</td>
                  <td>{m.avgLatencyMs.toFixed(0)} ms</td>
                  <td>
                    <span style={{ color: m.errorRate > 5 ? '#e05555' : 'inherit' }}>
                      {m.errorRate.toFixed(1)}%
                    </span>
                  </td>
                  <td>{total.toLocaleString()}</td>
                  <td><HealthBadge score={m.anomalyScore} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
