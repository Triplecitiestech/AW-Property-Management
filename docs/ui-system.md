# UI System — Smart Sumai

Last updated: 2026-03-01

## 1. Design Principles

- **Dark theme everywhere** — no light backgrounds, no gray-50/gray-100
- **No warm tones** — never use amber-*, orange-*, yellow-* Tailwind classes
- **Scannable** — primary info left, badges right, metadata labeled
- **Consistent** — same spacing, typography, and badges across all pages

## 2. Color Palette

### Backgrounds
| Token | Tailwind | Usage |
|-------|----------|-------|
| Surface | `bg-[#0f1829]` | Page background, input backgrounds |
| Card | `.card` (CSS class) | All card containers |
| Card hover | `bg-[#1e2d42]` | Card row hover state |
| Nested | `bg-[#0f1829]` | Nested elements inside cards |

### Text
| Token | Tailwind | Usage |
|-------|----------|-------|
| Primary | `text-white` | Headings, names, primary content |
| Secondary | `text-[#94a3b8]` | Body text, descriptions |
| Muted | `text-[#6480a0]` | Labels, metadata, timestamps |
| Dimmed | `text-[#4a6080]` | Dividers, subtle text, placeholders |

### Accent Colors
| Purpose | Color | Usage |
|---------|-------|-------|
| Brand / AI | `violet-*` | AI badges, primary actions, hover states |
| Success / Active | `green-*` / `emerald-*` | Active stays, confirmed status |
| Info / Warning | `sky-*` | Medium priority, cleaning status, banners |
| Danger / High | `rose-*` | Urgent/high priority, delete, error states |
| Guest / Teal | `teal-*` | Guest-facing items, secondary actions |

### Hover State
All interactive list rows use `group-hover:text-violet-300` consistently.

## 3. Typography

| Element | Classes |
|---------|---------|
| Page title | `text-2xl font-bold text-white` |
| Card/section title | `font-semibold text-white` (default size) |
| Small section title | `font-semibold text-sm text-white` |
| List row primary | `font-medium text-white` |
| List row secondary | `text-xs text-[#6480a0]` |
| Form label | `.form-label` (CSS class) |
| Metadata label | `text-xs text-[#6480a0]` |
| Mono text | `font-mono text-xs text-[#4a6080]` |

## 4. Spacing Scale

| Context | Pattern |
|---------|---------|
| Page sections | `space-y-6` |
| Card rows | `space-y-2` |
| Card row padding | `px-5 py-4` |
| Card body padding | `p-5` or `p-6` (forms) |
| Nested card padding | `p-3` |
| Grid gap | `gap-4` to `gap-6` |
| Empty state padding | `p-10 text-center` |

## 5. Card Shell

All cards use the `.card` CSS class from globals.css.
Hover state for clickable rows: `hover:bg-[#1e2d42] hover:border-[#3a5070] transition-all cursor-pointer`

## 6. List Row Pattern

```
[Avatar/Icon] [Primary + Secondary lines] ............... [Badges] [Arrow]
```

- Left: avatar or icon (optional), primary text + secondary metadata
- Right: status badge + priority badge (if applicable) + chevron arrow
- Entire row is a `<Link>` with `group` class
- Hover: `group-hover:text-violet-300` on primary text

### Metadata Display
- All metadata values MUST be labeled when shown outside their obvious context
- Labels: `Role:`, `Phone:`, `Email:`, `Properties:`, `Category:`, `Due:`
- Separator between inline metadata: `<span className="text-[#2a3d58]">·</span>`

## 7. Badge System

### Status Badges (CSS classes from globals.css)
| Class | Status |
|-------|--------|
| `.badge-open` | Open |
| `.badge-in_progress` | In Progress |
| `.badge-resolved` | Resolved |
| `.badge-closed` | Closed |
| `.badge-occupied` | Occupied |
| `.badge-unoccupied` | Unoccupied |
| `.badge-clean` | Clean |
| `.badge-needs_cleaning` | Needs Cleaning |
| `.badge-needs_maintenance` | Needs Maintenance |

### Priority Badges (CSS classes from globals.css)
| Class | Priority |
|-------|----------|
| `.badge-urgent` | Urgent (rose) |
| `.badge-high` | High (rose) |
| `.badge-medium` | Medium (sky) |
| `.badge-low` | Low (slate) |

### Special Badges
| Purpose | Style |
|---------|-------|
| AI action | `bg-violet-500/10 text-violet-400 border-violet-500/30` |
| Primary contact | `bg-violet-500/20 text-violet-300 border-violet-500/30` |
| External comment | `bg-teal-500/10 text-teal-400 border-teal-500/30` |

All badges use: `text-[10px] font-semibold px-1.5 py-0.5 rounded-full border`

## 8. Shared React Components

### StatusBadge
`src/components/ui/StatusBadge.tsx`
Renders `.badge badge-${value}` with proper casing.

### EmptyState
`src/components/ui/EmptyState.tsx`
Standard empty state: icon + heading + description + CTA button.

### SectionHeader
`src/components/ui/SectionHeader.tsx`
Card section header with optional action link on the right.

## 9. Empty States
- Container: `p-10 text-center`
- Icon: `w-12 h-12 text-[#4a6080] mx-auto mb-4`
- Heading: `text-lg font-semibold text-white mb-1`
- Description: `text-sm text-[#6480a0] mb-4`
- CTA: `btn-primary text-sm` or `text-violet-400 hover:text-violet-300`

## 10. Form Patterns
- Labels: `.form-label`
- Inputs: `.form-input`
- Selects: `.form-select`
- Grid: `grid grid-cols-2 gap-4` for side-by-side fields
- Actions: `flex gap-3 pt-2` for submit + cancel
