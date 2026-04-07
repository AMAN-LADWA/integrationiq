import { useState, useCallback, useEffect } from 'react';
import type { FlowMetric, Incident, AnalysisStatus, AnalysisUpdate } from './types';
import { useWebSocket } from './hooks/useWebSocket';
import { triggerAnalysis, fetchIncidents } from './api';
import { MetricCards } from './components/MetricCards';
import { FlowHealthList } from './components/FlowHealthList';
import { IncidentFeed } from './components/IncidentFeed';
import { LatencyChart } from './components/LatencyChart';

function formatISO(date: Date): string {
  return date.toISOString().replace('.000Z', 'Z');
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

  // Default time window: last 24 hours
  useEffect(() => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setFromInput(formatISO(yesterday));
    setToInput(formatISO(now));

    // Load existing incidents on mount
    fetchIncidents().then(setIncidents).catch(console.error);
  }, []);

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

  async function handleTrigger() {
    if (!fromInput || !toInput) return;
    setStatus('RUNNING');
    setStatusMsg('Submitting analysis request...');
    setMetrics([]);
    try {
      await triggerAnalysis(fromInput, toInput);
    } catch (e) {
      setStatus('ERROR');
      setStatusMsg('Failed to trigger analysis. Is the backend running?');
    }
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
          <div className="time-inputs">
            <label>From</label>
            <input
              type="text"
              className="time-input"
              value={fromInput}
              onChange={e => setFromInput(e.target.value)}
              placeholder="2024-01-01T00:00:00Z"
            />
            <label>To</label>
            <input
              type="text"
              className="time-input"
              value={toInput}
              onChange={e => setToInput(e.target.value)}
              placeholder="2024-01-02T00:00:00Z"
            />
          </div>
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
        <MetricCards metrics={metrics} incidents={incidents} />

        <div className="two-column">
          <FlowHealthList metrics={metrics} />
          <IncidentFeed incidents={incidents} />
        </div>

        <LatencyChart metrics={metrics} />
      </main>
    </div>
  );
}
