import { useState } from 'react';
import type { Incident } from '../types';

type SortKey = 'severity' | 'zscore' | 'errorRate' | 'latency';

interface Props {
  incidents: Incident[];
}

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };

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

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'severity',  label: 'Severity'   },
  { key: 'zscore',    label: 'Z-Score'    },
  { key: 'errorRate', label: 'Error Rate' },
  { key: 'latency',   label: 'Latency'    },
];

function sortIncidents(incidents: Incident[], by: SortKey): Incident[] {
  return [...incidents].sort((a, b) => {
    switch (by) {
      case 'severity':  return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      case 'zscore':    return b.anomalyScore - a.anomalyScore;
      case 'errorRate': return b.errorRate - a.errorRate;
      case 'latency':   return b.avgLatencyMs - a.avgLatencyMs;
    }
  });
}

export function IncidentFeed({ incidents }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('severity');

  const sorted = sortIncidents(incidents, sortBy);

  return (
    <div className="panel">
      <div className="panel-header-row">
        <h2 className="panel-title">
          AI Incident Feed {incidents.length > 0 && <span className="count-badge">{incidents.length}</span>}
        </h2>
        <div className="sort-controls">
          <span className="sort-label">Sort:</span>
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              className={`sort-btn ${sortBy === o.key ? 'active' : ''}`}
              onClick={() => setSortBy(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0
        ? <p className="empty-state">No incidents detected yet.</p>
        : (
          <div className="incident-list">
            {sorted.map(incident => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        )
      }
    </div>
  );
}
