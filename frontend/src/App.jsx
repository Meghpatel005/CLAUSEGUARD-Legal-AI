/**
 * App.jsx — ClauseGuard AI root component.
 *
 * Implements a phase-based state machine:
 *
 *   idle -> uploading -> analyzing -> ready
 *              | |
 *             error        error
 *
 * All server interaction is delegated to services/api.js.
 * The phase drives which UI panel is shown.
 */

import { useEffect, useState } from 'react';
import {
  Shield,
  FileText,
  RefreshCw,
  AlertCircle,
  BarChart2,
  MessageSquare,
  LogOut,
} from 'lucide-react';

import UploadZone from './components/UploadZone.jsx';
import LoadingState from './components/LoadingState.jsx';
import AnalysisPanel from './components/AnalysisPanel.jsx';
import ChatPanel from './components/ChatPanel.jsx';

import {
  uploadDocument,
  analyzeDocument,
  getDocument,
  listDocuments,
} from './services/api.js';
import { useAuth } from './auth/AuthContext.jsx';
import { navigate } from './lib/router.js';

// ── Tab definition ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'analysis', label: 'Analysis', Icon: BarChart2 },
  { id: 'chat',     label: 'Chat',     Icon: MessageSquare },
];

// ── Header ──────────────────────────────────────────────────────────────────

function AppHeader({ docMeta, analysis, onReset, onLogout }) {
  const LEVEL_DOT = {
    low:      'bg-risk-low',
    medium:   'bg-risk-medium',
    high:     'bg-risk-high',
    critical: 'bg-risk-critical',
  };

  return (
    <header className="sticky top-0 z-30 bg-surface-0/90 backdrop-blur border-b border-surface-3">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <Shield size={20} className="text-brand" strokeWidth={1.5} />
          <span className="font-semibold text-gray-100 text-sm">
            Clause<span className="text-brand">Guard</span> AI
          </span>
        </div>

        {/* Divider */}
        <span className="text-surface-3 select-none mx-1">|</span>

        {/* Document name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText size={14} className="text-gray-500 shrink-0" />
          <span className="text-sm text-gray-300 truncate">
            {docMeta?.filename ?? ''}
          </span>
        </div>

        {/* Risk indicator */}
        {analysis && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-2 h-2 rounded-full ${LEVEL_DOT[analysis.overall_risk_level] ?? 'bg-gray-500'}`} />
            <span className="text-xs text-gray-400 hidden sm:inline capitalize">
              {analysis.overall_risk_level} risk
            </span>
            <span className="text-xs font-mono text-gray-400">
              · {analysis.overall_risk_score}/100
            </span>
          </div>
        )}

        {/* New document button */}
        <button onClick={onReset} className="btn-ghost flex items-center gap-1.5 ml-2 shrink-0">
          <RefreshCw size={13} />
          <span className="hidden sm:inline">New</span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="btn-ghost flex items-center gap-1.5 shrink-0"
          title="Sign out"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

// ── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4">
      <div className="flex items-start gap-3 bg-risk-critical/10 border border-risk-critical/30 rounded-xl px-4 py-3">
        <AlertCircle size={16} className="text-risk-critical shrink-0 mt-0.5" />
        <p className="text-sm text-risk-critical flex-1">{message}</p>
        <button
          onClick={onDismiss}
          className="text-risk-critical/60 hover:text-risk-critical text-xs shrink-0"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function App() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Phase machine
  const [phase, setPhase] = useState('idle'); // idle | uploading | analyzing | ready | error

  // Data
  const [docMeta, setDocMeta]     = useState(null);  // { document_id, filename, page_count, word_count }
  const [analysis, setAnalysis]   = useState(null);  // AnalysisResponse shape
  const [errorMsg, setErrorMsg]   = useState(null);

  // UI state
  const [activeTab, setActiveTab] = useState('analysis');
  const [pastDocuments, setPastDocuments] = useState([]);
  const [loadingPast, setLoadingPast] = useState(false);

  useEffect(() => {
    if (phase !== 'idle' && phase !== 'error') return;
    let cancelled = false;
    (async () => {
      setLoadingPast(true);
      try {
        const docs = await listDocuments();
        if (!cancelled) setPastDocuments(docs);
      } catch {
        if (!cancelled) setPastDocuments([]);
      } finally {
        if (!cancelled) setLoadingPast(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleUpload = async (file) => {
    setErrorMsg(null);
    setPhase('uploading');

    try {
      const uploadResult = await uploadDocument(file);
      // uploadResult: { document_id, filename, page_count, word_count, upload_time }
      setDocMeta(uploadResult);

      setPhase('analyzing');
      const analysisResult = await analyzeDocument(uploadResult.document_id);
      setAnalysis(analysisResult);
      setPhase('ready');
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setDocMeta(null);
    setAnalysis(null);
    setErrorMsg(null);
    setActiveTab('analysis');
  };

  const handleOpenDocument = async (documentId) => {
    setErrorMsg(null);
    setPhase('analyzing');
    try {
      const doc = await getDocument(documentId);
      setDocMeta({
        document_id: doc.document_id,
        filename: doc.filename,
        page_count: doc.page_count,
        word_count: doc.word_count,
        upload_time: doc.uploaded_at,
      });
      if (doc.is_analyzed && doc.analysis) {
        setAnalysis(doc.analysis);
        setPhase('ready');
      } else {
        const analysisResult = await analyzeDocument(documentId);
        setAnalysis(analysisResult);
        setPhase('ready');
      }
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
    }
  };

  const handleDismissError = () => {
    setErrorMsg(null);
    if (phase === 'error') setPhase('idle');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  // Upload screen (idle or post-error retry)
  if (phase === 'idle' || (phase === 'error' && !docMeta)) {
    return (
      <>
        {errorMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
            <div className="flex items-start gap-3 bg-risk-critical/10 border border-risk-critical/30 rounded-xl px-4 py-3 shadow-xl">
              <AlertCircle size={16} className="text-risk-critical shrink-0 mt-0.5" />
              <p className="text-sm text-risk-critical flex-1">{errorMsg}</p>
              <button onClick={handleDismissError} className="text-risk-critical/60 hover:text-risk-critical text-xs">✕</button>
            </div>
          </div>
        )}
        <div className="min-h-screen flex flex-col">
          <UploadZone onUpload={handleUpload} disabled={false} />
          {(loadingPast || pastDocuments.length > 0) && (
            <div className="max-w-2xl mx-auto w-full px-4 pb-12 -mt-4">
              <h2 className="text-sm font-medium text-gray-400 mb-3">Your documents</h2>
              {loadingPast ? (
                <p className="text-xs text-gray-500">Loading…</p>
              ) : (
                <ul className="space-y-2">
                  {pastDocuments.map((d) => (
                    <li key={d.document_id}>
                      <button
                        type="button"
                        onClick={() => handleOpenDocument(d.document_id)}
                        className="w-full text-left rounded-xl border border-surface-3 bg-surface-1 hover:border-brand/40 px-4 py-3 transition-colors"
                      >
                        <p className="text-sm text-gray-200 truncate">{d.filename}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {d.page_count} pages · {d.is_analyzed ? 'Analyzed' : 'Pending analysis'}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  // Loading screens
  if (phase === 'uploading' || phase === 'analyzing') {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader docMeta={docMeta} analysis={null} onReset={handleReset} onLogout={handleLogout} />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6">
          <LoadingState phase={phase} />
        </main>
      </div>
    );
  }

  // Ready — full analysis + chat
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader docMeta={docMeta} analysis={analysis} onReset={handleReset} onLogout={handleLogout} />

      {errorMsg && (
        <ErrorBanner message={errorMsg} onDismiss={handleDismissError} />
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-surface-1 border border-surface-3 rounded-xl p-1 w-fit">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-150
                ${activeTab === id
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-surface-2'
                }
              `}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Panel */}
        {activeTab === 'analysis' && analysis && (
          <AnalysisPanel analysis={analysis} docMeta={docMeta} />
        )}

        {activeTab === 'chat' && (
          <ChatPanel
            documentId={docMeta.document_id}
            documentType={analysis?.document_type}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-3 py-4 text-center">
        <p className="text-xs text-gray-600">
          ClauseGuard AI · For academic review only · Not a substitute for qualified legal advice
        </p>
      </footer>
    </div>
  );
}
