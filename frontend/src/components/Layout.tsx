import { NavLink, Outlet } from 'react-router-dom'
import logo from '../assets/logo.png'
import { ledgerConfig } from '../ledger/config'

const navItems = [
  { to: '/', label: 'Privacy proof' },
  { to: '/sme', label: 'SME' },
  { to: '/lender', label: 'Lender' },
  { to: '/blocked', label: 'Double-pledge' },
  { to: '/smoke', label: 'Diagnostics' },
] as const

export function Layout() {
  const live = !ledgerConfig.useMocks

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-surface-900/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-6 py-3.5">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src={logo}
              alt="Unpledged"
              className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-ink-100">
                  Unpledged
                </h1>
                <span
                  className={[
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    live
                      ? 'bg-positive/15 text-positive ring-1 ring-positive/25'
                      : 'bg-warning/15 text-warning ring-1 ring-warning/25',
                  ].join(' ')}
                >
                  {live ? 'Live DevNet' : 'Mock mode'}
                </span>
              </div>
              <p className="truncate text-xs text-ink-500">
                Confidential receivables · Canton Network
              </p>
            </div>
          </div>

          <nav className="flex shrink-0 gap-1 rounded-xl bg-surface-850/80 p-1 ring-1 ring-white/6">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/10 text-ink-100 shadow-sm'
                      : 'text-ink-400 hover:bg-white/5 hover:text-ink-200',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-white/6 px-6 py-4">
        <p className="text-center text-xs text-ink-500">
          {live ? (
            <>
              Connected to Canton DevNet ·{' '}
              <a
                href="https://lighthouse.devnet.cantonloop.com/"
                target="_blank"
                rel="noreferrer"
                className="text-accent-bright hover:underline"
              >
                Lighthouse explorer
              </a>
            </>
          ) : (
            <>
              Mock ledger — set{' '}
              <code className="rounded bg-surface-800 px-1.5 py-0.5 font-mono text-[11px] text-ink-300">
                VITE_USE_MOCKS=false
              </code>{' '}
              for live data
            </>
          )}
        </p>
      </footer>
    </div>
  )
}
