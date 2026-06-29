import { useState } from 'react'
import { IconCopy } from './icons'

function truncateId(value: string, head = 12, tail = 8): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

export function CopyableId({
  value,
  label,
  className = '',
}: {
  value: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      {label ? (
        <span className="w-full text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted sm:w-auto">
          {label}
        </span>
      ) : null}
      <code
        className="max-w-full truncate font-mono text-xs text-ink-200"
        title={value}
      >
        {truncateId(value)}
      </code>
      <button
        type="button"
        onClick={() => void copy()}
        className="shrink-0 border border-white/10 p-1.5 text-ink-muted transition-colors hover:border-white/20 hover:text-lime"
        aria-label="Copy"
      >
        <IconCopy className="h-3.5 w-3.5" />
      </button>
      {copied ? (
        <span className="text-[10px] uppercase tracking-wider text-lime">Copied</span>
      ) : null}
    </div>
  )
}
