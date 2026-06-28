import { NavLink, Outlet } from 'react-router-dom'
import { IconShield } from './icons'

const navItems = [
  { to: '/', label: 'Privacy proof' },
  { to: '/sme', label: 'SME' },
  { to: '/lender', label: 'Lender' },
  { to: '/blocked', label: 'Double-pledge' },
  { to: '/smoke', label: 'Smoke test' },
] as const

export function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-surface-700 bg-surface-900">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <IconShield className="h-5 w-5 text-accent" />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-500">
                Canton Network
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-ink-100">
                Unpledged
              </h1>
            </div>
          </div>
          <nav className="flex gap-1">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [
                    'px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-surface-700 text-ink-100'
                      : 'text-ink-400 hover:bg-surface-800 hover:text-ink-200',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-surface-700 bg-surface-900 px-6 py-2">
        <p className="text-center text-xs text-ink-500">
          Mock ledger data — swap via{' '}
          <code className="font-mono text-ink-400">src/ledger/api.ts</code>
        </p>
      </footer>
    </div>
  )
}
