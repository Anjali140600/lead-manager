export const STATUSES = ['New', 'Contacted', 'Qualified', 'Lost'] as const;
export const SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Event', 'Other'] as const;

export type LeadStatus = (typeof STATUSES)[number];
export type LeadSource = (typeof SOURCES)[number];

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: LeadSource;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export type LeadInput = Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>;

export interface LeadResponse {
  data: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type LeadStats = Record<LeadStatus, number> & { Total: number };
