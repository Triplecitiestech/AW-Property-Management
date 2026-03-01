import Link from 'next/link'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
}

export default function EmptyState({ icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="p-10 text-center">
      {icon && <div className="w-12 h-12 text-[#4a6080] mx-auto mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-[#6480a0] mb-4">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary text-sm inline-flex">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
