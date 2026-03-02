import Link from 'next/link'

/* ─── Column definition ──────────────────────────────────────── */

export interface Column {
  label: string
  /** CSS Grid track width, e.g. '1fr', '120px', 'minmax(100px, 1fr)' */
  width: string
  align?: 'left' | 'center' | 'right'
  /** Hide this column below a breakpoint. Uses a CSS class. */
  hideBelow?: 'sm' | 'md' | 'lg'
}

/* ─── Helper: build grid-template-columns string ─────────────── */

export function gridCols(columns: Column[]): string {
  return columns.map(c => c.width).join(' ')
}

/* ─── DataGridHeader ─────────────────────────────────────────── */

interface HeaderProps {
  columns: Column[]
}

export function DataGridHeader({ columns }: HeaderProps) {
  const template = gridCols(columns)
  return (
    <div
      className="grid items-center px-5 py-2.5 mb-1"
      style={{ gridTemplateColumns: template }}
    >
      {columns.map((col, i) => {
        const align =
          col.align === 'center' ? 'text-center' :
          col.align === 'right' ? 'text-right' : 'text-left'
        const hide =
          col.hideBelow === 'sm' ? 'hidden sm:block' :
          col.hideBelow === 'md' ? 'hidden md:block' :
          col.hideBelow === 'lg' ? 'hidden lg:block' : ''
        return (
          <span
            key={i}
            className={`text-[11px] font-semibold text-[#4a6080] uppercase tracking-wider ${align} ${hide}`}
          >
            {col.label}
          </span>
        )
      })}
    </div>
  )
}

/* ─── DataGridRow ────────────────────────────────────────────── */

interface RowProps {
  href: string
  columns: Column[]
  children: React.ReactNode
}

export function DataGridRow({ href, columns, children }: RowProps) {
  const template = gridCols(columns)
  return (
    <Link
      href={href}
      className="grid items-center px-5 py-3.5 rounded-xl border border-[#2a3d58] bg-[#1a2436]
                 hover:bg-[#1e2d42] hover:border-[#3a5070] transition-all cursor-pointer group"
      style={{ gridTemplateColumns: template }}
    >
      {children}
    </Link>
  )
}

/* ─── DataGridCell ───────────────────────────────────────────── */

interface CellProps {
  children: React.ReactNode
  align?: 'left' | 'center' | 'right'
  /** Hide below breakpoint — must match the column definition */
  hideBelow?: 'sm' | 'md' | 'lg'
  className?: string
}

export function DataGridCell({ children, align = 'left', hideBelow, className = '' }: CellProps) {
  const justify =
    align === 'center' ? 'justify-center' :
    align === 'right' ? 'justify-end' : 'justify-start'
  const hide =
    hideBelow === 'sm' ? 'hidden sm:flex' :
    hideBelow === 'md' ? 'hidden md:flex' :
    hideBelow === 'lg' ? 'hidden lg:flex' : 'flex'
  return (
    <div className={`${hide} items-center ${justify} min-w-0 ${className}`}>
      {children}
    </div>
  )
}

/* ─── Compact variants for dashboard cards ───────────────────── */

export function DataGridHeaderCompact({ columns }: HeaderProps) {
  const template = gridCols(columns)
  return (
    <div
      className="grid items-center px-5 py-2 border-b border-[#2a3d58]"
      style={{ gridTemplateColumns: template }}
    >
      {columns.map((col, i) => {
        const align =
          col.align === 'center' ? 'text-center' :
          col.align === 'right' ? 'text-right' : 'text-left'
        const hide =
          col.hideBelow === 'sm' ? 'hidden sm:block' :
          col.hideBelow === 'md' ? 'hidden md:block' :
          col.hideBelow === 'lg' ? 'hidden lg:block' : ''
        return (
          <span
            key={i}
            className={`text-[10px] font-semibold text-[#4a6080] uppercase tracking-wider ${align} ${hide}`}
          >
            {col.label}
          </span>
        )
      })}
    </div>
  )
}

interface CompactRowProps {
  href: string
  columns: Column[]
  children: React.ReactNode
}

export function DataGridRowCompact({ href, columns, children }: CompactRowProps) {
  const template = gridCols(columns)
  return (
    <Link
      href={href}
      className="grid items-center px-5 py-2.5 border-b border-[#1e2d42]/60
                 hover:bg-[#1e2d42] transition-colors cursor-pointer group"
      style={{ gridTemplateColumns: template }}
    >
      {children}
    </Link>
  )
}
