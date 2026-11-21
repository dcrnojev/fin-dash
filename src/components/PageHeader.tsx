import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  // Buttons or links on the right, such as the page's main action.
  actions?: ReactNode
}

// The heading of a page inside the shell: the only h1 on it.
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
