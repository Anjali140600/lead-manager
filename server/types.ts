export const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Lost'] as const;
export const LEAD_SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Event', 'Other'] as const;

export interface LeadRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: (typeof LEAD_SOURCES)[number];
  status: (typeof LEAD_STATUSES)[number];
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: LeadRow['source'];
  status: LeadRow['status'];
  createdAt: string;
  updatedAt: string;
}

export function toLead(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
