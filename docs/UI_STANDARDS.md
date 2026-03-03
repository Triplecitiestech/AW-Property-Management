# UI Standards — Smart Sumai Design System

Last updated: 2026-03-03

This document defines the visual and structural standards for all list pages,
badges, alignment, spacing, and typography across the Smart Sumai platform.
All current and future pages must follow these rules.

---

## 1. Table System

All list pages use the **DataGrid** component (`src/components/ui/DataGrid.tsx`).

### Components

| Component | Usage |
|-----------|-------|
| `DataGridHeader` | Column headers for full pages |
| `DataGridRow` | Clickable row with `<Link>` wrapper |
| `DataGridCell` | Individual cell with alignment and responsive hiding |
| `DataGridHeaderCompact` | Headers inside dashboard cards |
| `DataGridRowCompact` | Rows inside dashboard cards (subtler styling) |

### Column Definition

Every page defines a `COLUMNS` array using the `Column` interface:

```typescript
interface Column {
  label: string        // Header text (empty string for icon-only columns)
  width: string        // CSS grid track: '1fr', '110px', 'minmax(100px, 1fr)'
  align?: 'left' | 'center' | 'right'
  hideBelow?: 'sm' | 'md' | 'lg'  // Responsive breakpoint to hide
}
```

### No Custom Table Layouts

All list/grid views must use DataGrid. No one-off flexbox card lists, HTML tables,
or custom grid implementations. This ensures consistent row height, hover behavior,
padding, and alignment across the entire app.

---

## 2. Alignment Rules

These rules are absolute and apply to every column on every page.

| Column Type | Alignment | Examples |
|-------------|-----------|---------|
| Text | `left` | Names, titles, addresses, phone numbers, dates |
| Numeric | `right` | Ticket counts, totals, scores |
| Badge (status/priority/role/condition) | `left` | StatusBadge components |
| Icon / Arrow | `center` | Chevron arrows, action icons |

**Never center-align text or badges.** Center is only for icon-only columns.

---

## 3. Column Width Scale

Standard widths used across pages for consistency:

| Width | Purpose | Examples |
|-------|---------|---------|
| `1fr` | Primary column (stretches) | Property name, contact name, title |
| `72px` | Short ID / code | WO#, ticket number |
| `100px` | Small count / compact badge | Open tickets (dashboard) |
| `110px` | Standard badge | Occupancy, status, priority |
| `120px` | Role badge | Contact role |
| `140px` | Medium text | Phone numbers |
| `160px` | Property name (secondary) | Property column on non-property pages |
| `200px` | Long text | Date ranges |
| `32px` | Arrow / icon column | Chevron arrow |

---

## 4. Badge System

### Component

Use `StatusBadge` (`src/components/ui/StatusBadge.tsx`) for all badges.
Never write inline badge styles.

### Variants

| Variant | Usage | CSS Pattern |
|---------|-------|-------------|
| `status` (default) | Ticket status, property status, occupancy | `.badge-{value}` |
| `priority` | Work order priority | `.badge-{mapped}` via PRIORITY_MAP |
| `role` | Contact roles | `.badge-{value}` (muted palette) |
| `custom` | One-off badges with explicit className | `.badge` + custom classes |

### CSS Classes (globals.css)

**Priority badges:**
- `.badge-urgent` — red
- `.badge-high` — rose
- `.badge-medium` — sky
- `.badge-low` — emerald

**Ticket status:**
- `.badge-open` — blue
- `.badge-in_progress` — violet
- `.badge-resolved` — emerald
- `.badge-closed` — muted

**Property status:**
- `.badge-clean` — emerald
- `.badge-needs_cleaning` — sky
- `.badge-needs_maintenance` — red
- `.badge-needs_groceries` — rose
- `.badge-occupied` — cyan
- `.badge-unoccupied` — muted

**Contact roles (all muted):**
- `.badge-cleaning`, `.badge-maintenance`, `.badge-plumbing`, `.badge-electrical`,
  `.badge-hvac`, `.badge-landscaping`, `.badge-primary`, `.badge-other`

### Color Rules

- **Never use** `amber-*`, `orange-*`, `yellow-*` Tailwind classes
- Warnings / info → `sky-*`
- Danger / high priority → `rose-*`
- AI-related → `violet-*`
- Success / active → `green-*` / `emerald-*`
- Muted / inactive → `#162030` bg with `#6480a0` text

---

## 5. Spacing

### Row Spacing

| Context | Value |
|---------|-------|
| Full page row padding | `px-5 py-3.5` |
| Dashboard compact row padding | `px-5 py-2.5` |
| Gap between full page rows | `space-y-1.5` |
| Dashboard compact rows | border-bottom separator |

### Card Spacing

| Context | Value |
|---------|-------|
| Card body | `p-5` or `p-6` (forms) |
| Card header | `p-5` with flex justify-between |
| Page sections | `space-y-6` |
| Grid gaps | `gap-4` to `gap-6` |

### Empty States

| Context | Value |
|---------|-------|
| Container | `p-10 text-center` |
| Icon | `w-12 h-12 text-[#4a6080]` |

---

## 6. Typography

| Element | Classes |
|---------|---------|
| Page title (h1) | `text-2xl font-bold text-white` |
| Section title | `text-base font-semibold text-white` |
| Row primary text | `font-medium text-white` |
| Row secondary text | `text-xs text-[#6480a0]` |
| Muted metadata | `text-xs text-[#3d5a78]` |
| Monospace (IDs) | `font-mono text-xs text-[#6480a0]` |
| Badge text | `text-xs font-semibold tracking-wide` (via `.badge`) |

---

## 7. Color Palette

### Backgrounds

| Token | Value | Usage |
|-------|-------|-------|
| Page | `bg-[#0f1829]` | Body, page background |
| Card | `.card` class | All card containers |
| Card hover | `bg-[#1e2d42]` | Row hover state |
| Nested | `bg-[#0f1829]` | Inner card elements |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `text-white` | Headings, names |
| Secondary | `text-[#94a3b8]` | Body, descriptions |
| Muted | `text-[#6480a0]` | Labels, metadata |
| Dimmed | `text-[#4a6080]` | Placeholders, subtle |

### Hover

All clickable rows use `group-hover:text-violet-300` on primary text.

---

## 8. Responsive Rules

### Hide Priority

When screen width shrinks, columns hide in this order (first hidden = least important):

1. `hideBelow: 'md'` — Property name (on non-property pages), Open Tickets
2. `hideBelow: 'sm'` — Dates, Phone, Occupancy

### Always Visible

These columns must never have `hideBelow`:
- Primary column (1fr) — the row's identity
- Condition / Status — critical at-a-glance info
- Arrow column — navigation affordance

---

## 9. Dark Theme

Every page, component, and modal must use the dark theme.

- No `gray-50`, `gray-100`, `bg-white` unless overridden in globals.css
- No light-mode utility classes without dark-mode override
- All new components must use the palette defined in section 7

---

## 10. Page Structure

Every list page follows this structure:

```
<div className="space-y-6">
  {/* Header: Title + action button */}
  <div className="flex items-center justify-between">...</div>

  {/* Filters (if applicable) */}
  <div className="card p-4">
    <form>...</form>
  </div>

  {/* Grid */}
  <div>
    <DataGridHeader columns={COLUMNS} />
    <div className="space-y-1.5">
      {items.map(item => (
        <DataGridRow key={item.id} href={`/path/${item.id}`} columns={COLUMNS}>
          <DataGridCell>...</DataGridCell>
          ...
        </DataGridRow>
      ))}
    </div>

    {/* Empty state */}
    {!items?.length && <EmptyState ... />}
  </div>
</div>
```
