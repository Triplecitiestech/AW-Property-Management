import Link from 'next/link'

interface SectionHeaderProps {
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
}

export default function SectionHeader({ title, description, actionLabel, actionHref }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        {description && <p className="text-xs text-[#6480a0] mt-0.5">{description}</p>}
      </div>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
