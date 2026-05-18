/**
 * AdminApp — ClauseGuard admin dashboard (college project scope).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Settings,
  Search,
  Bell,
  Shield,
  Upload,
  UserPlus,
  FileDown,
  LogOut,
  ArrowLeft,
  Trash2,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { navigate } from '../../lib/router.js';
import {
  getAdminStats,
  getAdminUsers,
  getAdminDocuments,
  getAdminRiskyClauses,
  adminDeleteUser,
  adminDeleteDocument,
  adminCreateUser,
} from '../../services/api.js';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'users', label: 'Users', Icon: Users },
  { id: 'contracts', label: 'Contracts', Icon: FileText },
  { id: 'reports', label: 'Reports', Icon: BarChart3 },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

const RISK_STYLES = {
  low: 'text-risk-low bg-risk-low/10 border-risk-low/30',
  medium: 'text-risk-medium bg-risk-medium/10 border-risk-medium/30',
  high: 'text-risk-high bg-risk-high/10 border-risk-high/30',
  critical: 'text-risk-critical bg-risk-critical/10 border-risk-critical/30',
};

function StatCard({ label, value, sub }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-100">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function BarChart({ data, valueKey, labelKey, color = 'bg-brand' }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="flex items-end gap-2 h-32 pt-4">
      {data.length === 0 ? (
        <p className="text-xs text-gray-500">No data yet</p>
      ) : (
        data.map((d) => (
          <div key={d[labelKey]} className="flex flex-1 flex-col items-center gap-1 min-w-0">
            <div
              className={`w-full rounded-t ${color} min-h-[4px] transition-all`}
              style={{ height: `${Math.max(8, (d[valueKey] / max) * 100)}%` }}
              title={`${d[valueKey]}`}
            />
            <span className="text-[9px] text-gray-500 truncate w-full text-center">
              {String(d[labelKey]).slice(5)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function RiskBadge({ level }) {
  if (!level) return <span className="text-xs text-gray-500">—</span>;
  return (
    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${RISK_STYLES[level] ?? RISK_STYLES.medium}`}>
      {level}
    </span>
  );
}

export default function AdminApp() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [riskyClauses, setRiskyClauses] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, u, c, r] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminDocuments(),
        getAdminRiskyClauses(),
      ]);
      setStats(s);
      setUsers(u);
      setContracts(c);
      setRiskyClauses(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredContracts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter(
      (c) =>
        c.filename?.toLowerCase().includes(q) ||
        c.uploaded_by?.toLowerCase().includes(q)
    );
  }, [contracts, search]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await adminDeleteUser(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteContract = async (id) => {
    if (!window.confirm('Delete this contract?')) return;
    try {
      await adminDeleteDocument(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await adminCreateUser(newUser);
      setShowAddUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const downloadReport = () => {
    const report = {
      generated_at: new Date().toISOString(),
      stats,
      users_count: users.length,
      contracts_count: contracts.length,
      risky_clauses: riskyClauses,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clauseguard-admin-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface-0 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-surface-3 bg-surface-1/80 shrink-0">
        <div className="p-4 border-b border-surface-3 flex items-center gap-2">
          <Shield size={20} className="text-brand" />
          <span className="text-sm font-semibold">
            Admin<span className="text-brand">Panel</span>
          </span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                tab === id
                  ? 'bg-brand/15 text-brand-light font-medium'
                  : 'text-gray-400 hover:bg-surface-2 hover:text-gray-200'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-surface-3">
          <button
            type="button"
            onClick={() => navigate('/app')}
            className="btn-ghost w-full flex items-center gap-2 justify-center text-xs"
          >
            <ArrowLeft size={14} />
            User app
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-surface-3 bg-surface-0/90 backdrop-blur flex items-center gap-3 px-4 shrink-0">
          <div className="md:hidden flex items-center gap-2">
            <Shield size={18} className="text-brand" />
            <span className="text-sm font-semibold">Admin</span>
          </div>
          <div className="flex-1 max-w-md relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              placeholder="Search users or contracts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-surface-1 border border-surface-3 text-gray-100 placeholder:text-gray-600 focus:border-brand focus:outline-none"
            />
          </div>
          <button type="button" className="btn-ghost p-2 relative" title="Notifications">
            <Bell size={18} />
            {stats?.risky_contracts > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-risk-critical" />
            )}
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-surface-3">
            <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-gray-200 leading-tight">{user?.name}</p>
              <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{user?.email}</p>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="btn-ghost p-2" title="Logout">
            <LogOut size={16} />
          </button>
        </header>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-1 p-2 border-b border-surface-3 overflow-x-auto">
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs ${
                tab === id ? 'bg-brand text-white' : 'bg-surface-2 text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-risk-critical/40 bg-risk-critical/10 px-4 py-3 text-sm text-risk-critical">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-500 text-center py-20">Loading admin data…</p>
          ) : (
            <>
              {tab === 'dashboard' && stats && (
                <div className="space-y-6 max-w-6xl">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Users" value={stats.total_users} sub={`${stats.active_users_today} active today`} />
                    <StatCard label="Total Contracts" value={stats.total_contracts} />
                    <StatCard label="AI Scans" value={stats.ai_analyses_done} />
                    <StatCard label="Risky Contracts" value={stats.risky_contracts} sub="High or critical" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => navigate('/app')} className="btn-primary flex items-center gap-2 text-sm">
                      <Upload size={14} /> Upload Contract
                    </button>
                    <button type="button" onClick={() => { setTab('users'); setShowAddUser(true); }} className="btn-ghost border border-surface-3 flex items-center gap-2 text-sm">
                      <UserPlus size={14} /> Add User
                    </button>
                    <button type="button" onClick={downloadReport} className="btn-ghost border border-surface-3 flex items-center gap-2 text-sm">
                      <FileDown size={14} /> Generate Report
                    </button>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="card p-5">
                      <h2 className="text-sm font-semibold text-gray-200 mb-4">Uploads (7 days)</h2>
                      <BarChart data={stats.daily_uploads} valueKey="uploads" labelKey="date" />
                    </div>
                    <div className="card p-5">
                      <h2 className="text-sm font-semibold text-gray-200 mb-4">Risk distribution</h2>
                      <BarChart
                        data={stats.risk_distribution}
                        valueKey="count"
                        labelKey="level"
                        color="bg-risk-high"
                      />
                    </div>
                  </div>

                  <div className="card overflow-hidden">
                    <div className="px-5 py-4 border-b border-surface-3 flex justify-between items-center">
                      <h2 className="text-sm font-semibold text-gray-200">Recent Contracts</h2>
                      <button type="button" className="text-xs text-brand hover:underline" onClick={() => setTab('contracts')}>
                        View all
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 border-b border-surface-3">
                            <th className="px-5 py-3 font-medium">Contract</th>
                            <th className="px-5 py-3 font-medium">Risk</th>
                            <th className="px-5 py-3 font-medium">Owner</th>
                            <th className="px-5 py-3 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredContracts.slice(0, 8).map((c) => (
                            <tr key={c.document_id} className="border-b border-surface-3/50 hover:bg-surface-2/30">
                              <td className="px-5 py-3 truncate max-w-[200px]">{c.filename}</td>
                              <td className="px-5 py-3"><RiskBadge level={c.risk_level} /></td>
                              <td className="px-5 py-3 text-gray-400 text-xs">{c.uploaded_by}</td>
                              <td className="px-5 py-3">
                                <button type="button" className="btn-ghost text-xs flex items-center gap-1" onClick={() => navigate('/app')}>
                                  <Eye size={12} /> View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card p-5">
                    <h2 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-risk-high" />
                      AI Analysis — Detected risky clauses
                    </h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {riskyClauses.length === 0 ? (
                        <p className="text-xs text-gray-500">No high-risk clauses detected yet.</p>
                      ) : (
                        riskyClauses.slice(0, 10).map((cl, i) => (
                          <div key={i} className="rounded-lg border border-surface-3 bg-surface-0/50 p-3">
                            <div className="flex justify-between gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-200">{cl.clause_title}</span>
                              <RiskBadge level={cl.risk_level} />
                            </div>
                            <p className="text-xs text-gray-500">{cl.filename} · Score {cl.overall_risk_score ?? '—'}/100</p>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{cl.risk_reason}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'users' && (
                <div className="max-w-4xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h1 className="text-lg font-semibold">Users</h1>
                    <button type="button" onClick={() => setShowAddUser(true)} className="btn-primary text-sm flex items-center gap-2">
                      <UserPlus size={14} /> Add User
                    </button>
                  </div>
                  {showAddUser && (
                    <form onSubmit={handleAddUser} className="card p-4 space-y-3">
                      <input className="w-full rounded-lg border border-surface-3 bg-surface-0 px-3 py-2 text-sm" placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
                      <input className="w-full rounded-lg border border-surface-3 bg-surface-0 px-3 py-2 text-sm" placeholder="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                      <input className="w-full rounded-lg border border-surface-3 bg-surface-0 px-3 py-2 text-sm" placeholder="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={8} />
                      <select className="w-full rounded-lg border border-surface-3 bg-surface-0 px-3 py-2 text-sm" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary text-sm">Create</button>
                        <button type="button" className="btn-ghost text-sm" onClick={() => setShowAddUser(false)}>Cancel</button>
                      </div>
                    </form>
                  )}
                  <div className="card divide-y divide-surface-3">
                    {filteredUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                          <span className="text-[10px] uppercase text-brand mt-1 inline-block">{u.role}</span>
                        </div>
                        {u.role !== 'admin' && (
                          <button type="button" onClick={() => handleDeleteUser(u.id)} className="btn-ghost text-risk-critical p-2">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'contracts' && (
                <div className="max-w-5xl">
                  <h1 className="text-lg font-semibold mb-4">Contracts</h1>
                  <div className="card overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b border-surface-3">
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Risk</th>
                          <th className="px-4 py-3">Score</th>
                          <th className="px-4 py-3">Owner</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredContracts.map((c) => (
                          <tr key={c.document_id} className="border-b border-surface-3/50">
                            <td className="px-4 py-3 max-w-[180px] truncate">{c.filename}</td>
                            <td className="px-4 py-3 text-xs capitalize text-gray-400">{c.status}</td>
                            <td className="px-4 py-3"><RiskBadge level={c.risk_level} /></td>
                            <td className="px-4 py-3 font-mono text-xs">{c.risk_score ?? '—'}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{c.uploaded_by_email}</td>
                            <td className="px-4 py-3">
                              <button type="button" onClick={() => handleDeleteContract(c.document_id)} className="text-risk-critical hover:opacity-80">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'reports' && stats && (
                <div className="max-w-3xl space-y-6">
                  <h1 className="text-lg font-semibold">Reports</h1>
                  <div className="card p-5 space-y-4">
                    <p className="text-sm text-gray-400">Summary export and risk breakdown for presentations.</p>
                    <button type="button" onClick={downloadReport} className="btn-primary flex items-center gap-2">
                      <FileDown size={16} /> Download JSON report
                    </button>
                    <div>
                      <h3 className="text-xs uppercase text-gray-500 mb-2">Top risky categories</h3>
                      <ul className="space-y-2">
                        {(stats.top_risky_categories ?? []).map((c) => (
                          <li key={c.category} className="flex justify-between text-sm">
                            <span>{c.category}</span>
                            <span className="text-gray-500">{c.count} clauses</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'settings' && (
                <div className="max-w-lg space-y-4">
                  <h1 className="text-lg font-semibold">Settings</h1>
                  <div className="card p-5 space-y-3 text-sm text-gray-400">
                    <p><span className="text-gray-200">Admin email:</span> {user?.email}</p>
                    <p><span className="text-gray-200">Role:</span> {user?.role}</p>
                    <p className="text-xs pt-2 border-t border-surface-3">
                      Admin accounts are configured via ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env.
                      Restart the server after changing them.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
