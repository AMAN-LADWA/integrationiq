#!/usr/bin/env node
/**
 * trigger-analysis.js
 *
 * External script that POSTs to the IntegrationIQ analysis endpoint.
 * Usage:
 *   node trigger-analysis.js [fromISO] [toISO]
 *
 * Examples:
 *   node trigger-analysis.js                                      # last 24h
 *   node trigger-analysis.js 2024-01-01T00:00:00Z 2024-01-02T00:00:00Z
 */

const BASE_URL = process.env.IIQ_URL || 'http://localhost:8080';

function toISO(date) {
  return date.toISOString().replace('.000Z', 'Z');
}

async function main() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const from = process.argv[2] || toISO(yesterday);
  const to   = process.argv[3] || toISO(now);

  const url = `${BASE_URL}/api/analyse/trigger?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  console.log(`Triggering analysis: ${from} → ${to}`);
  console.log(`POST ${url}`);

  try {
    const response = await fetch(url, { method: 'POST' });
    const body = await response.json();

    if (response.ok) {
      console.log('✓ Accepted:', body.message);
    } else {
      console.error('✗ Error:', response.status, body);
      process.exit(1);
    }
  } catch (err) {
    console.error('✗ Request failed:', err.message);
    console.error('  Is the backend running at', BASE_URL, '?');
    process.exit(1);
  }
}

main();
