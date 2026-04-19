import { ShieldCheck } from 'lucide-react';
import { navigate } from '../lib/router';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-0 text-gray-100">
      <div className="pointer-events-none absolute inset-0 landing-grid" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[100px] landing-float" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-brand-muted/35 blur-[90px] landing-float-delayed" />
      <div className="pointer-events-none absolute top-1/3 left-0 h-64 w-64 rounded-full bg-brand/10 blur-3xl landing-shimmer" />

      <header className="relative z-10 border-b border-surface-3/70 backdrop-blur-sm bg-surface-0/40">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-left transition-opacity hover:opacity-90"
          >
            <ShieldCheck size={22} className="text-brand" strokeWidth={1.8} />
            <span className="text-sm font-semibold tracking-tight">
              ClauseVerifyer AI
            </span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-center text-sm leading-relaxed text-gray-400">
            {subtitle}
          </p>
        )}

        <div className="landing-badge mt-8 rounded-2xl border border-surface-3/90 bg-surface-1/90 p-6 shadow-[0_20px_60px_-30px_rgba(124,58,237,0.45)] backdrop-blur-md">
          {children}
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>
        )}
      </main>
    </div>
  );
}
