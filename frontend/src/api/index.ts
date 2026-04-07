import axios from 'axios';
import type { Incident } from '../types';

const BASE = '/api';

export async function triggerAnalysis(from: string, to: string): Promise<void> {
  await axios.post(`${BASE}/analyse/trigger`, null, { params: { from, to } });
}

export async function fetchIncidents(): Promise<Incident[]> {
  const { data } = await axios.get<Incident[]>(`${BASE}/incidents`);
  return data;
}

export async function resetIncidents(): Promise<number> {
  const { data } = await axios.delete<{ deletedCount: number }>(`${BASE}/incidents`);
  return data.deletedCount;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const { data } = await axios.get(`${BASE}/health`);
    return data?.status === 'UP';
  } catch {
    return false;
  }
}
