import type { Incident } from '../types';

interface Props {
  incidents: Incident[];
}

function SeverityBadge({ severity }: { severity: Incident['severity'] }) {
  const cls = {
    CRITICAL: 'badge badge-critical',
    HIGH: 'badge badge-high',
    MEDIUM: 'badge badge-medium',
  }[severity];
  return <span className={cls}>{severity}</span>;
}

function IncidentCard({ incident }: { incident: Incident }) {
  const createdAt = new Date(incident.createdAt).toLocaleString();
  return (
    <div className={`incident-card severity-${incident.severity.toLowerCase()}`}>
      <div className="incident-header">
        <span className="incident-flow">{incident.flowName}</span>
        <SeverityBadge severity={incident.severity} />
      </div>
      <div className="incident-tenant">{incident.anonymisedTenant}</div>
      <p className="incident-summary">{incident.summary}</p>
      <div className="incident-detail">
        <span className="detail-label">Root Cause:</span> {incident.rootCause}
      </div>
      <div className="incident-detail">
        <span className="detail-label">Recommendation:</span> {incident.recommendedAction}
      </div>
      <div className="incident-metrics">
        <span>Latency: {incident.avgLatencyMs.toFixed(0)} ms</span>
        <span>Error rate: {incident.errorRate.toFixed(1)}%</span>
        <span>Z-score: {incident.anomalyScore.toFixed(2)}</span>
      </div>
      <div className="incident-time">{createdAt}</div>
    </div>
  );
}

export function IncidentFeed({ incidents }: Props) {
  const sorted = [...incidents].sort((a, b) => {
    const sOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
    return sOrder[a.severity] - sOrder[b.severity];
  });

  if (sorted.length === 0) {
    return (
      <div className="panel">
        <h2 className="panel-title">AI Incident Feed</h2>
        <p className="empty-state">No incidents detected yet.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="panel-title">AI Incident Feed <span className="count-badge">{sorted.length}</span></h2>
      <div className="incident-list">
        {sorted.map((incident) => (
          <IncidentCard key={incident.id} incident={incident} />
        ))}
      </div>
    </div>
  );
}
