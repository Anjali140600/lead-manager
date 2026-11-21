import { useCallback, useEffect, useState } from 'react';
import { createLead, deleteLead, getCurrentUser, getLeads, getStats, login, logout, signup, updateLead } from './api';
import { AuthScreen } from './components/AuthScreen';
import { LeadForm } from './components/LeadForm';
import { StatusBadge } from './components/StatusBadge';
import { STATUSES, type AuthUser, type Lead, type LeadInput, type LeadStats } from './types';
import './styles.css';

const EMPTY_STATS: LeadStats = { Total: 0, New: 0, Contacted: 0, Qualified: 0, Lost: 0 };

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats>(EMPTY_STATS);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  const loadLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const result = await getLeads({ search, status, sortBy, sortOrder, page, limit: 8 });
      setLeads(result.data);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load leads.');
    } finally {
      setLoading(false);
    }
  }, [user, search, status, sortBy, sortOrder, page]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getStats();
      setStats(result.data);
    } catch {
      // The table error already gives the user a retry action.
    }
  }, [user]);

  useEffect(() => {
    getCurrentUser()
      .then((result) => setUser(result.data))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(loadLeads, 250);
    return () => window.clearTimeout(timer);
  }, [user, loadLeads]);

  useEffect(() => { if (user) loadStats(); }, [user, loadStats]);
  useEffect(() => { setPage(1); }, [search, status]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openCreate() {
    setEditing(null);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setFormError('');
    setFormOpen(true);
  }

  async function saveLead(input: LeadInput) {
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await updateLead(editing.id, input);
        setToast('Lead updated successfully.');
      } else {
        await createLead(input);
        setToast('Lead added successfully.');
      }
      setFormOpen(false);
      await Promise.all([loadLeads(), loadStats()]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the lead.');
    } finally {
      setSaving(false);
    }
  }

  async function removeLead(lead: Lead) {
    if (!window.confirm(`Delete ${lead.name}? This action cannot be undone.`)) return;
    try {
      await deleteLead(lead.id);
      setToast('Lead deleted.');
      if (leads.length === 1 && page > 1) setPage((value) => value - 1);
      else await loadLeads();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the lead.');
    }
  }

  function sort(column: string) {
    if (sortBy === column) setSortOrder((value) => value === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(column);
      setSortOrder('asc');
    }
  }

  const sortMark = (column: string) => sortBy === column ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : '';

  async function handleLogin(input: { email: string; password: string }) {
    const result = await login(input);
    setUser(result.data);
  }

  async function handleSignup(input: { name: string; email: string; password: string }) {
    const result = await signup(input);
    setUser(result.data);
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setLeads([]);
    setStats(EMPTY_STATS);
    setSearch('');
    setStatus('');
    setPage(1);
  }

  if (authLoading) return <div className="auth-loading"><div className="spinner" /><p>Opening LeadFlow…</p></div>;
  if (!user) return <AuthScreen onLogin={handleLogin} onSignup={handleSignup} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="LeadFlow home"><span>LF</span><strong>LeadFlow</strong></a>
        <div className="user-menu"><div className="user-chip"><span>{user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div><button onClick={handleLogout}>Log out</button></div>
      </header>

      <main>
        <section className="page-heading">
          <div><span className="eyebrow">Sales pipeline</span><h1>Leads</h1><p>Capture prospects and keep every conversation moving.</p></div>
          <button className="button primary" onClick={openCreate}><span aria-hidden="true">＋</span> Add lead</button>
        </section>

        <section className="stats-grid" aria-label="Lead totals by status">
          {(['Total', ...STATUSES] as const).map((item) => (
            <button key={item} className={`stat-card stat-${item.toLowerCase()} ${status === item ? 'selected' : ''}`} onClick={() => item !== 'Total' && setStatus(status === item ? '' : item)}>
              <span>{item}</span><strong>{stats[item]}</strong>
            </button>
          ))}
        </section>

        <section className="table-card">
          <div className="toolbar">
            <div className="search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" aria-label="Search leads by name" />{search && <button onClick={() => setSearch('')} aria-label="Clear search">×</button>}</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
          </div>

          {error ? (
            <div className="state-message"><strong>We couldn't load your leads</strong><p>{error}</p><button className="button secondary" onClick={loadLeads}>Try again</button></div>
          ) : loading ? (
            <div className="state-message"><div className="spinner" /><p>Loading leads…</p></div>
          ) : leads.length === 0 ? (
            <div className="state-message"><div className="empty-icon">◇</div><strong>No leads found</strong><p>{search || status ? 'Try changing your search or filter.' : 'Add your first lead to start building the pipeline.'}</p>{!search && !status && <button className="button primary" onClick={openCreate}>Add first lead</button>}</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th><button onClick={() => sort('name')}>Lead{sortMark('name')}</button></th><th>Contact</th><th>Source</th><th><button onClick={() => sort('status')}>Status{sortMark('status')}</button></th><th><button onClick={() => sort('createdAt')}>Added{sortMark('createdAt')}</button></th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>{leads.map((lead) => (
                  <tr key={lead.id}>
                    <td><div className="lead-name"><span>{lead.name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase()}</span><div><strong>{lead.name}</strong><small>{lead.company}</small></div></div></td>
                    <td><div className="contact"><a href={`mailto:${lead.email}`}>{lead.email}</a><small>{lead.phone}</small></div></td>
                    <td>{lead.source}</td><td><StatusBadge status={lead.status} /></td>
                    <td>{new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(lead.createdAt))}</td>
                    <td><div className="row-actions"><button onClick={() => openEdit(lead)} aria-label={`Edit ${lead.name}`}>Edit</button><button className="danger-link" onClick={() => removeLead(lead)} aria-label={`Delete ${lead.name}`}>Delete</button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {!error && !loading && total > 0 && <footer className="pagination"><span>Showing {(page - 1) * 8 + 1}–{Math.min(page * 8, total)} of {total}</span><div><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div></footer>}
        </section>
      </main>

      {formOpen && <LeadForm lead={editing} saving={saving} serverError={formError} onClose={() => !saving && setFormOpen(false)} onSubmit={saveLead} />}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </div>
  );
}
