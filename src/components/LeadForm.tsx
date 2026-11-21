import { useEffect, useState, type FormEvent } from 'react';
import { SOURCES, STATUSES, type Lead, type LeadInput } from '../types';

const EMPTY_FORM: LeadInput = {
  name: '',
  email: '',
  phone: '',
  company: '',
  source: 'Website',
  status: 'New',
};

interface Props {
  lead: Lead | null;
  saving: boolean;
  serverError: string;
  onClose: () => void;
  onSubmit: (input: LeadInput) => Promise<void>;
}

export function LeadForm({ lead, saving, serverError, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<LeadInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof LeadInput, string>>>({});

  useEffect(() => {
    setForm(lead ? {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
      status: lead.status,
    } : EMPTY_FORM);
  }, [lead]);

  function setField<K extends keyof LeadInput>(key: K, value: LeadInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate() {
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = 'Enter at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (!/^[+\d][\d\s().-]{6,19}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number.';
    if (!form.company.trim()) next.company = 'Company is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    await onSubmit({
      ...form,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      company: form.company.trim(),
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="lead-form-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow">{lead ? 'Update record' : 'New record'}</span>
            <h2 id="lead-form-title">{lead ? 'Edit lead' : 'Add a lead'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={submit} noValidate>
          {serverError && <div className="alert" role="alert">{serverError}</div>}
          <div className="form-grid">
            <label>
              <span>Name *</span>
              <input autoFocus value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Aarav Sharma" aria-invalid={Boolean(errors.name)} />
              {errors.name && <small>{errors.name}</small>}
            </label>
            <label>
              <span>Email *</span>
              <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="aarav@company.com" aria-invalid={Boolean(errors.email)} />
              {errors.email && <small>{errors.email}</small>}
            </label>
            <label>
              <span>Phone *</span>
              <input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+91 98765 43210" aria-invalid={Boolean(errors.phone)} />
              {errors.phone && <small>{errors.phone}</small>}
            </label>
            <label>
              <span>Company *</span>
              <input value={form.company} onChange={(e) => setField('company', e.target.value)} placeholder="Acme Pvt. Ltd." aria-invalid={Boolean(errors.company)} />
              {errors.company && <small>{errors.company}</small>}
            </label>
            <label>
              <span>Source *</span>
              <select value={form.source} onChange={(e) => setField('source', e.target.value as LeadInput['source'])}>
                {SOURCES.map((source) => <option key={source}>{source}</option>)}
              </select>
            </label>
            <label>
              <span>Status *</span>
              <select value={form.status} onChange={(e) => setField('status', e.target.value as LeadInput['status'])}>
                {STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          </div>
          <div className="modal-actions">
            <button className="button secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="button primary" type="submit" disabled={saving}>{saving ? 'Saving…' : lead ? 'Save changes' : 'Add lead'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
