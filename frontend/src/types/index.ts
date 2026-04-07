export interface FlowMetric {
  flowName: string;
  anonymisedTenant: string;
  statusCounts: Record<string, number>;
  errorRate: number;
  avgLatencyMs: number;
  anomalyScore: number;
}

export interface Incident {
  id: number;
  flowName: string;
  anonymisedTenant: string;
  fromTime: string;
  toTime: string;
  summary: string;
  rootCause: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  recommendedAction: string;
  errorRate: number;
  avgLatencyMs: number;
  anomalyScore: number;
  createdAt: string;
}

export type AnalysisStatus = 'IDLE' | 'RUNNING' | 'COMPLETE' | 'ERROR';

export interface AnalysisUpdate {
  status: 'RUNNING' | 'COMPLETE' | 'ERROR';
  message: string;
  metrics?: FlowMetric[];
  incidents?: Incident[];
}
