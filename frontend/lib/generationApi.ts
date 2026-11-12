const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
import { supabase, getSafeSession } from './supabase';

async function getAuthHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const session = await getSafeSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function dispatchGeneration(payload: { session_id: string; target_provider?: string; settings: any }) {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
  const r = await fetch(`${BASE}/api/v1/generation/dispatch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error(`Dispatch failed: HTTP ${r.status}`);
  return r.json();
}

export async function getJobStatus(jobId: string) {
  const headers = await getAuthHeaders();
  const r = await fetch(`${BASE}/api/v1/generation/jobs/${jobId}`, { headers });
  if (!r.ok) throw new Error(`Get job status failed: HTTP ${r.status}`);
  return r.json();
}

export async function getManifest(generationId: string) {
  const headers = await getAuthHeaders();
  const r = await fetch(`${BASE}/api/v1/generation/manifests/${generationId}`, { headers });
  if (!r.ok) throw new Error(`Get manifest failed: HTTP ${r.status}`);
  return r.json();
}

export async function getAssets(generationId: string) {
  const headers = await getAuthHeaders();
  const r = await fetch(`${BASE}/api/v1/generation/assets/${generationId}`, { headers });
  if (!r.ok) throw new Error(`Get assets failed: HTTP ${r.status}`);
  return r.json();
}

export async function getProviders() {
  const headers = await getAuthHeaders();
  const r = await fetch(`${BASE}/api/v1/generation/providers`, { headers });
  if (!r.ok) throw new Error(`Get providers failed: HTTP ${r.status}`);
  return r.json();
}

export async function getHealth() {
  const r = await fetch(`${BASE}/api/v1/generation/health`);
  if (!r.ok) throw new Error(`Get health failed: HTTP ${r.status}`);
  return r.json();
}
