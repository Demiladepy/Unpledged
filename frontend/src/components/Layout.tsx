import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ledgerConfig } from '../ledger/config'
import { PARTIES, partyDisplayName } from '../ledger/parties'
import { CopyableId } from './CopyableId'
import { IconMenu, IconX } from './icons'
import { LedgerHeartbeat } from './LedgerHeartbeat'
import { LiveBadge } from './LiveBadge'

const navItems = [
  { to: '/', label: 'Privacy' },
  { to: '/sme', label: 'SME' },
  { to: '/lender', label: 'Lender' },
  { to: '/blocked', label: 'Blocked' },
  { to: '/demo', label: 'Full flow' },
] as const

function actingPartyForPath(pathname: string): { label: string; party: string } {
  if (pathname.startsWith('/sme')) {
    return { label: 'Acting party', party: PARTIES.SME }
  }
  if (pathname.startsWith('/lender')) {
    return { label: 'Acting party', party: PARTIES.LENDER_A }
  }
  if (pathname.startsWith('/blocked')) {
    return { label: 'Attempting party', party: PARTIES.LENDER_A }
  }
  if (pathname.startsWith('/smoke')) {
    return { label: 'API user', party: `user:${ledgerConfig.userId}` }
  }
  return { label: 'Comparison', party: `${PARTIES.LENDER_A} vs ${PARTIES.LENDER_B}` }
}

export function Layout() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const acting = actingPartyForPath(pathname)
  const live = !ledgerConfig.useMocks
  const showPartyId =
    acting.party.includes('::') && !acting.party.includes(' vs ')

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1680px] px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-base font-semibold tracking-tight text-ink-100 sm:text-lg">
                Unpledged
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                Canton Network
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
              <LedgerHeartbeat />
              <LiveBadge />
              <button
                type="button"
                className="border border-white/10 p-2 text-ink-200 lg:hidden"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              >
                {menuOpen ? (
                  <IconX className="h-5 w-5" />
                ) : (
                  <IconMenu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-3 hidden items-center justify-between gap-4 lg:flex">
            <div className="inline-flex min-w-0 items-center gap-3 border border-white/10 bg-white/[0.02] px-3 py-2">
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                {acting.label}
              </span>
              <span className="h-3.5 w-px shrink-0 bg-white/10" aria-hidden />
              {showPartyId ? (
                <CopyableId value={acting.party} />
              ) : (
                <span className="truncate font-display text-xs font-medium tracking-wide text-ink-200">
                  {pathname === '/'
                    ? `${partyDisplayName(PARTIES.LENDER_A)} / ${partyDisplayName(PARTIES.LENDER_B)}`
                    : partyDisplayName(acting.party)}
                </span>
              )}
            </div>

            <nav className="flex shrink-0 border border-white/10">
              {navItems.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    [
                      'border-r border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] last:border-r-0 transition-colors',
                      isActive
                        ? 'bg-lime text-bg'
                        : 'text-ink-muted hover:bg-white/[0.03] hover:text-ink-200',
                    ].join(' ')
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          {menuOpen ? (
            <nav className="mt-3 grid grid-cols-2 gap-px border border-white/10 bg-white/10 lg:hidden">
              {navItems.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    [
                      'bg-bg px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.08em] transition-colors',
                      isActive ? 'text-lime' : 'text-ink-muted',
                    ].join(' ')
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.06] pt-3 lg:hidden">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              {acting.label}
            </span>
            {showPartyId ? (
              <CopyableId value={acting.party} className="flex-wrap" />
            ) : (
              <span className="font-display text-xs font-medium tracking-wide text-ink-200">
                {pathname === '/'
                  ? `${partyDisplayName(PARTIES.LENDER_A)} / ${partyDisplayName(PARTIES.LENDER_B)}`
                  : partyDisplayName(acting.party)}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1680px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-white/10 px-4 py-4 sm:px-8">
        <p className="text-center text-[11px] leading-relaxed text-ink-dim">
          {live ? (
            <>
              Ledger queries against Canton DevNet ·{' '}
              <a
                href="https://lighthouse.devnet.cantonloop.com/"
                target="_blank"
                rel="noreferrer"
                className="text-ink-muted underline decoration-white/20 underline-offset-2 hover:text-lime"
              >
                Lighthouse explorer
              </a>
            </>
          ) : (
            <>
              Mock ledger — set{' '}
              <code className="font-mono text-ink-muted">VITE_USE_MOCKS=false</code>{' '}
              for live data
            </>
          )}
        </p>
      </footer>
    </div>
  )
}
