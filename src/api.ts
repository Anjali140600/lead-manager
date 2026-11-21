import type { Lead, LeadInput, LeadResponse, LeadStats } from './types';

interface Filters {
  search: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.message ?? body?.message ?? 'Something went wrong. Please try again.';
    throw new Error(message);
  }
  return body;
}

export function getLeads(filters: Filters) {
  const params = new URLSearchParams({
    search: filters.search,
    status: filters.status,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page: String(filters.page),
    limit: String(filters.limit),
  });
  return request<LeadResponse>(`/api/leads?${params}`);
}

export function getStats() {
  return request<{ data: LeadStats }>('/api/leads/stats');
}

export function createLead(input: LeadInput) {
  return request<{ data: Lead }>('/api/leads', { method: 'POST', body: JSON.stringify(input) });
}

export function updateLead(id: number, input: LeadInput) {
  return request<{ data: Lead }>(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteLead(id: number) {
  return request<void>(`/api/leads/${id}`, { method: 'DELETE' });
}
