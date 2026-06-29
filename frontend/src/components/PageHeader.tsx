import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  lead?: ReactNode
  aside?: ReactNode
}

export function PageHeader({ eyebrow, title, lead, aside }: PageHeaderProps) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-3xl">
        {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
        <h2 className="page-title">{title}</h2>
        {lead ? <p className="page-lead">{lead}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </header>
  )
}
