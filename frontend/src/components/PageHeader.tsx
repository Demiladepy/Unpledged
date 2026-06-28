import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  lead?: ReactNode
}

export function PageHeader({ eyebrow, title, lead }: PageHeaderProps) {
  return (
    <header className="mb-8">
      {eyebrow ? <p className="label-muted mb-2">{eyebrow}</p> : null}
      <h2 className="page-title">{title}</h2>
      {lead ? <p className="page-lead">{lead}</p> : null}
    </header>
  )
}
