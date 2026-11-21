import { z } from 'zod';
import { LEAD_SOURCES, LEAD_STATUSES } from './types.js';

const trimmedText = (field: string, max: number) => z.string()
  .trim()
  .min(1, `${field} is required.`)
  .max(max, `${field} must be ${max} characters or fewer.`);

export const leadSchema = z.object({
  name: trimmedText('Name', 100).min(2, 'Name must be at least 2 characters.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  phone: z.string().trim().regex(/^[+\d][\d\s().-]{6,19}$/, 'Enter a valid phone number.'),
  company: trimmedText('Company', 120),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES),
}).strict();

export const idSchema = z.coerce.number().int().positive();

export const querySchema = z.object({
  search: z.string().trim().max(100).default(''),
  status: z.enum(LEAD_STATUSES).or(z.literal('')).default(''),
  sortBy: z.enum(['name', 'status', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
