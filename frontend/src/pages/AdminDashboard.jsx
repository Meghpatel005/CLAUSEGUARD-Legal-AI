import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  FileText,
  Filter,
  Home,
  LayoutDashboard,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { navigate } from '../lib/router.js';
import {
  deleteAdminDocument,
  getAdminDocuments,
  getAdminUsers,
} from '../services/api.js';

export default function AdminDashboard() {
  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showOnlyAnalyzed, setShowOnlyAnalyzed] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [docData, userData] = await Promise.all([
        getAdminDocuments(),
        getAdminUsers(),
      ]);
      setDocuments(docData.documents ?? []);
      setTotal(docData.total ?? 0);
      setUsers(userData ?? []);
    } catch (err) {
      setError(err.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  const visibleDocuments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesQuery =
        !q ||
        doc.filename.toLowerCase().includes(q) ||
        doc.document_id.toLowerCase().includes(q);
      const matchesAnalyzed = !showOnlyAnalyzed || doc.is_analyzed;
      return matchesQuery && matchesAnalyzed;
    });
  }, [documents, query, showOnlyAnalyzed]);

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (documentId) => {
    try {
      await deleteAdminDocument(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.document_id !== documentId));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.message || 'Delete failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-700">
      <div className="flex min-h-screen">
        <aside className="w-64 bg-slate-800 text-slate-100 hidden md:flex md:flex-col">
          <div className="h-14 px-4 border-b border-slate-700 flex items-center gap-2">
            <Shield size={18} />
            <span className="font-semibold">Open Admin</span>
          </div>
          <div className="px-4 py-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full rounded-md bg-slate-700 border border-slate-600 pl-9 pr-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>
          <nav className="px-2 space-y-1 text-sm">
            <button type="button" className="w-full flex items-center gap-2 rounded-md px-3 py-2 bg-slate-700">
              <LayoutDashboard size={14} />
              Dashboard
            </button>
            <button type="button" className="w-full flex items-center gap-2 rounded-md px-3 py-2 bg-brand/40">
              <FileText size={14} />
              Documents
            </button>
            <button type="button" className="w-full flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-700">
              <Users size={14} />
              Users
            </button>
            <button type="button" onClick={() => navigate('/app')} className="w-full flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-700">
              <Home size={14} />
              Back to App
            </button>
          </nav>
        </aside>

        <main className="flex-1">
          <header className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-800">Page List</h1>
              <p className="text-xs text-gray-500">Home / Pages</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </header>

          <div className="p-4 sm:p-6">
            {error && (
              <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button type="button" className="rounded bg-emerald-500 text-white px-3 py-1.5 text-sm">
                  + New
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnlyAnalyzed((prev) => !prev)}
                  className="rounded bg-blue-500 text-white px-3 py-1.5 text-sm"
                >
                  <span className="inline-flex items-center gap-1">
                    <Filter size={13} />
                    {showOnlyAnalyzed ? 'Show All' : 'Only Analyzed'}
                  </span>
                </button>
                <button type="button" className="rounded bg-rose-500 text-white px-3 py-1.5 text-sm">
                  Report
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full max-w-sm">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by filename or ID"
                    className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-brand"
                  />
                </div>
                <div className="text-sm text-gray-500">
                  Total documents: <span className="font-semibold text-gray-700">{total}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2">ID</th>
                    <th className="text-left px-4 py-2">Title</th>
                    <th className="text-left px-4 py-2">Pages</th>
                    <th className="text-left px-4 py-2">Words</th>
                    <th className="text-left px-4 py-2">Tag</th>
                    <th className="text-left px-4 py-2">Updated</th>
                    <th className="text-left px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td className="px-4 py-4 text-gray-500" colSpan={7}>
                        Loading admin data...
                      </td>
                    </tr>
                  )}
                  {!loading && visibleDocuments.length === 0 && (
                    <tr>
                      <td className="px-4 py-4 text-gray-500" colSpan={7}>
                        No documents found.
                      </td>
                    </tr>
                  )}
                  {!loading && visibleDocuments.map((doc) => (
                    <tr key={doc.document_id} className="border-t border-gray-100 hover:bg-gray-50/70">
                      <td className="px-4 py-2 font-mono text-xs">{doc.document_id}</td>
                      <td className="px-4 py-2">{doc.filename}</td>
                      <td className="px-4 py-2">{doc.page_count}</td>
                      <td className="px-4 py-2">{doc.word_count}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${doc.is_analyzed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {doc.is_analyzed ? 'analyzed' : 'new'}
                        </span>
                      </td>
                      <td className="px-4 py-2">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button type="button" className="text-gray-500 hover:text-gray-700" title="View">
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                            onClick={() => handleDelete(doc.document_id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-base font-semibold text-gray-800 mb-3">Users (Mock)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm bg-gray-50"
                  >
                    <p className="font-medium text-gray-800">{user.name}</p>
                    <p className="text-gray-500">{user.email}</p>
                    <p className="text-xs capitalize text-gray-600 mt-1">{user.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
