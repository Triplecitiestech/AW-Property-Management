import Link from 'next/link'

interface ListRowProps {
  href: string
  /** Avatar initial character or React node */
  avatar?: React.ReactNode
  /** Primary text (name, title) */
  primary: string
  /** Secondary metadata line */
  secondary?: React.ReactNode
  /** Right-side badges */
  badges?: React.ReactNode
  /** Show chevron arrow on the right */
  showArrow?: boolean
}

export default function ListRow({ href, avatar, primary, secondary, badges, showArrow = true }: ListRowProps) {
  return (
    <Link
      href={href}
      className="card flex items-center gap-4 px-5 py-4 hover:bg-[#1e2d42] hover:border-[#3a5070] transition-all cursor-pointer group"
    >
      {avatar && (
        <div className="flex-shrink-0">{avatar}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white group-hover:text-violet-300 transition-colors truncate">
          {primary}
        </p>
        {secondary && (
          <div className="text-xs text-[#6480a0] mt-0.5 truncate">
            {secondary}
          </div>
        )}
      </div>
      {badges && <div className="flex items-center gap-2 flex-shrink-0">{badges}</div>}
      {showArrow && (
        <svg className="w-4 h-4 text-[#4a6080] group-hover:text-violet-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </Link>
  )
}
