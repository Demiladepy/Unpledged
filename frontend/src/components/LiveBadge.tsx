import { ledgerConfig } from '../ledger/config'

export function LiveBadge() {
  const live = !ledgerConfig.useMocks

  if (!live) {
    return (
      <span className="inline-flex items-center gap-2 border border-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
        Mock mode
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 border border-lime/25 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-lime">
      <span className="h-1.5 w-1.5 bg-lime" aria-hidden />
      Live on Canton DevNet
    </span>
  )
}
