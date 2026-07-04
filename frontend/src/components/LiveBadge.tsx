import { ledgerConfig } from '../ledger/config'
import { partiesConfigured } from '../ledger/parties'

export function LiveBadge() {
  const live = !ledgerConfig.useMocks
  const partiesReady = partiesConfigured()

  if (!live) {
    return (
      <span className="inline-flex items-center gap-2 border border-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
        Mock mode
      </span>
    )
  }

  if (!partiesReady) {
    return (
      <span className="inline-flex items-center gap-2 border border-negative/30 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-negative">
        Live · parties not set
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 border border-lime/25 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-lime">
      <span className="live-dot h-1.5 w-1.5 rounded-full bg-lime" aria-hidden />
      Live on Canton DevNet
    </span>
  )
}
