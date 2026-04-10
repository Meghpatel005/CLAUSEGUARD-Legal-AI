import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  FileSearch,
  MessageCircle,
  Zap,
  Layers,
} from 'lucide-react';
import { navigate } from './lib/router';

const featureCards = [
  {
    title: 'Upload and analyze',
    desc: 'Drop a PDF and get structured risk scoring and clause-level insight in one flow.',
    Icon: FileSearch,
  },
  {
    title: 'Clause intelligence',
    desc: 'Surface obligations, ambiguities, and unusual terms before you commit.',
    Icon: Layers,
  },
  {
    title: 'Grounded chat',
    desc: 'Ask follow-ups that stay tied to your document — with local history on this device.',
    Icon: MessageCircle,
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-0 text-gray-100">
      <div className="pointer-events-none absolute inset-0 landing-grid" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[100px] landing-float" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-brand-muted/35 blur-[90px] landing-float-delayed" />
      <div className="pointer-events-none absolute top-1/3 left-0 h-64 w-64 rounded-full bg-brand/10 blur-3xl landing-shimmer" />

      <header className="relative z-10 border-b border-surface-3/70 backdrop-blur-sm bg-surface-0/40">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2">
            <ShieldCheck size={22} className="text-brand" strokeWidth={1.8} />
            <span className="text-sm font-semibold tracking-tight">
              Clause<span className="text-brand">Guard</span> AI
            </span>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn-ghost text-sm"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="btn-ghost text-sm"
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              Launch app
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <section className="mx-auto max-w-4xl text-center">
          <span className="landing-badge inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand-light">
            <Sparkles size={14} className="landing-icon-spin" />
            Legal document intelligence
          </span>

          <h1 className="landing-title mt-8 text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl sm:leading-[1.08]">
            Review contracts with{' '}
            <span className="landing-gradient-text">confidence</span>
            {' '}and speed.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-gray-400 sm:text-lg">
            ClauseGuard AI combines upload, structured analysis, and grounded chat — same dark theme
            and purple accent you use in the app, with a focused workflow for academic review.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="group inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_-8px_rgba(124,58,237,0.7)] transition-all duration-200 hover:bg-brand-light hover:shadow-[0_0_50px_-6px_rgba(124,58,237,0.85)]"
            >
              Get started
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="inline-flex items-center gap-2 rounded-xl border border-surface-3 bg-surface-1/80 px-6 py-3.5 text-sm font-medium text-gray-200 backdrop-blur-sm transition-all duration-200 hover:border-brand/50 hover:bg-surface-2"
            >
              <Zap size={16} className="text-brand-light" />
              Open analyzer
            </button>
          </div>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map(({ title, desc, Icon }) => (
            <article
              key={title}
              className="landing-card rounded-2xl border border-surface-3/90 bg-surface-1/75 p-6 backdrop-blur-md"
            >
              <div className="mb-4 inline-flex rounded-xl border border-brand/35 bg-brand/10 p-2.5 text-brand-light">
                <Icon size={18} strokeWidth={1.8} />
              </div>
              <h2 className="text-base font-semibold text-gray-100">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{desc}</p>
            </article>
          ))}
        </section>

        <section className="mt-16 rounded-2xl border border-surface-3/80 bg-gradient-to-br from-surface-1/90 to-surface-0/80 p-8 text-center backdrop-blur-sm sm:p-10">
          <p className="text-sm font-medium text-gray-300">
            Ready when you are — no setup, straight into upload and analysis.
          </p>
          <button
            type="button"
            onClick={() => navigate('/app')}
            className="btn-primary mt-5 inline-flex items-center gap-2 px-6"
          >
            Launch ClauseGuard
            <ArrowRight size={15} />
          </button>
        </section>
      </main>

      <footer className="relative z-10 border-t border-surface-3/70 py-6 text-center">
        <p className="text-xs text-gray-600">
          ClauseGuard AI · For academic review only · Not a substitute for qualified legal advice
        </p>
      </footer>
    </div>
  );
}
