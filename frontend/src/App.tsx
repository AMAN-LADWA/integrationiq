import { useState, useCallback, useEffect, useMemo } from 'react';
import type { FlowMetric, Incident, AnalysisStatus, AnalysisUpdate } from './types';
import { useWebSocket } from './hooks/useWebSocket';
import { triggerAnalysis, fetchIncidents, resetIncidents } from './api';
import { MetricCards } from './components/MetricCards';
import { FlowHealthList } from './components/FlowHealthList';
import { IncidentFeed } from './components/IncidentFeed';
import { LatencyChart } from './components/LatencyChart';
import { TenantFilter } from './components/TenantFilter';

function formatISO(date: Date): string {
  return date.toISOString().replace('.000Z', 'Z');
}

function toDatetimeLocal(iso: string): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

function fromDatetimeLocal(local: string): string {
  if (!local) return '';
  return new Date(local).toISOString().replace('.000Z', 'Z');
}

function StatusBar({ status, message }: { status: AnalysisStatus; message: string }) {
  if (status === 'IDLE') return null;
  const cls = {
    RUNNING: 'status-bar running',
    COMPLETE: 'status-bar complete',
    ERROR: 'status-bar error',
  }[status] ?? 'status-bar';
  return (
    <div className={cls}>
      {status === 'RUNNING' && <span className="spinner" />}
      {message}
    </div>
  );
}

export default function App() {
  const [metrics, setMetrics] = useState<FlowMetric[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>('IDLE');
  const [statusMsg, setStatusMsg] = useState('');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setFromInput(formatISO(yesterday));
    setToInput(formatISO(now));
    fetchIncidents().then(data => {
      setIncidents(data);
      // Pre-select all tenants from loaded incidents
      setSelectedTenants(new Set(data.map(i => i.anonymisedTenant)));
    }).catch(console.error);
  }, []);

  // All unique tenants across metrics + incidents
  const allTenants = useMemo(() => {
    const set = new Set<string>();
    metrics.forEach(m => set.add(m.anonymisedTenant));
    incidents.forEach(i => set.add(i.anonymisedTenant));
    return [...set].sort();
  }, [metrics, incidents]);

  // When new tenants appear, auto-select them
  useEffect(() => {
    setSelectedTenants(prev => {
      const next = new Set(prev);
      let changed = false;
      allTenants.forEach(t => { if (!next.has(t)) { next.add(t); changed = true; } });
      return changed ? next : prev;
    });
  }, [allTenants]);

  const filteredMetrics = useMemo(
    () => metrics.filter(m => selectedTenants.has(m.anonymisedTenant)),
    [metrics, selectedTenants]
  );

  const filteredIncidents = useMemo(
    () => incidents.filter(i => selectedTenants.has(i.anonymisedTenant)),
    [incidents, selectedTenants]
  );

  const handleUpdate = useCallback((update: AnalysisUpdate) => {
    setStatus(update.status === 'RUNNING' ? 'RUNNING'
      : update.status === 'COMPLETE' ? 'COMPLETE' : 'ERROR');
    setStatusMsg(update.message);

    if (update.metrics) setMetrics(update.metrics);
    if (update.incidents) {
      setIncidents(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const newOnes = update.incidents!.filter(i => !existingIds.has(i.id));
        return [...newOnes, ...prev];
      });
    }
  }, []);

  useWebSocket(handleUpdate);

  async function handleReset() {
    if (!window.confirm('Delete all stored incidents and clear the dashboard?')) return;
    setResetting(true);
    try {
      const deleted = await resetIncidents();
      setIncidents([]);
      setMetrics([]);
      setSelectedTenants(new Set());
      setStatus('IDLE');
      setStatusMsg('');
      console.info(`Reset complete — ${deleted} incident(s) deleted.`);
    } catch (_e) {
      alert('Reset failed. Is the backend running?');
    } finally {
      setResetting(false);
    }
  }

  async function handleTrigger() {
    if (!fromInput || !toInput) return;
    setStatus('RUNNING');
    setStatusMsg('Submitting analysis request...');
    setMetrics([]);
    try {
      await triggerAnalysis(fromInput, toInput);
    } catch (_e) {
      setStatus('ERROR');
      setStatusMsg('Failed to trigger analysis. Is the backend running?');
    }
  }

  const quickRanges = [
    { label: 'Last 1h',  ms: 60 * 60 * 1000 },
    { label: 'Last 6h',  ms: 6 * 60 * 60 * 1000 },
    { label: 'Last 24h', ms: 24 * 60 * 60 * 1000 },
    { label: 'Last 7d',  ms: 7 * 24 * 60 * 60 * 1000 },
  ];

  function applyQuickRange(ms: number) {
    const now = new Date();
    setFromInput(formatISO(new Date(now.getTime() - ms)));
    setToInput(formatISO(now));
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-name">IntegrationIQ</span>
          <span className="brand-sub">SAP Cloud Integration Monitor</span>
        </div>
        <div className="header-controls">
          <TenantFilter
            tenants={allTenants}
            selected={selectedTenants}
            onChange={setSelectedTenants}
          />
          <div className="quick-ranges">
            {quickRanges.map(r => (
              <button key={r.label} className="quick-btn" onClick={() => applyQuickRange(r.ms)}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="time-inputs">
            <label>From</label>
            <input
              type="datetime-local"
              className="time-input"
              value={toDatetimeLocal(fromInput)}
              onChange={e => setFromInput(fromDatetimeLocal(e.target.value))}
            />
            <label>To</label>
            <input
              type="datetime-local"
              className="time-input"
              value={toDatetimeLocal(toInput)}
              onChange={e => setToInput(fromDatetimeLocal(e.target.value))}
            />
          </div>
          <button
            className="reset-btn"
            onClick={handleReset}
            disabled={resetting || status === 'RUNNING'}
            title="Delete all stored incidents and clear the dashboard"
          >
            {resetting ? 'Clearing…' : '⟳ Refresh DB'}
          </button>
          <button
            className="trigger-btn"
            onClick={handleTrigger}
            disabled={status === 'RUNNING'}
          >
            {status === 'RUNNING' ? 'Analysing…' : 'Run Analysis'}
          </button>
        </div>
      </header>

      <StatusBar status={status} message={statusMsg} />

      <main className="main-content">
        <MetricCards metrics={filteredMetrics} incidents={filteredIncidents} />

        <div className="two-column">
          <FlowHealthList metrics={filteredMetrics} />
          <IncidentFeed incidents={filteredIncidents} />
        </div>

        <LatencyChart metrics={filteredMetrics} />
      </main>
    </div>
  );
}
