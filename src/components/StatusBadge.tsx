import type { LeadStatus } from '../types';

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}><i />{status}</span>;
}
