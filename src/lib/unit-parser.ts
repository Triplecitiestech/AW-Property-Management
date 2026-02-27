/**
 * Parses bulk unit identifier strings into a flat list of unit identifiers.
 *
 * Supported formats (mix-and-match with commas):
 *   "101-150"        → ["101", "102", ..., "150"]    (numeric range)
 *   "56A-56D"        → ["56A", "56B", "56C", "56D"]  (alpha-suffix range)
 *   "56A,56B,56C"    → ["56A", "56B", "56C"]          (comma list)
 *   "101-110,201-210,300" → combined
 */
export function parseUnitIdentifiers(input: string): {
  identifiers: string[]
  error?: string
} {
  const raw = input.trim()
  if (!raw) return { identifiers: [], error: 'Input is empty.' }

  const segments = raw.split(',').map(s => s.trim()).filter(Boolean)
  const identifiers: string[] = []

  for (const seg of segments) {
    if (!seg.includes('-')) {
      // Single identifier — normalise to uppercase
      identifiers.push(seg.toUpperCase())
      continue
    }

    // It's a range: split on the FIRST dash only so "56A-56D" → ["56A", "56D"]
    const dashIdx = seg.indexOf('-')
    const startRaw = seg.slice(0, dashIdx).trim().toUpperCase()
    const endRaw   = seg.slice(dashIdx + 1).trim().toUpperCase()

    if (!startRaw || !endRaw) {
      return { identifiers: [], error: `Invalid range: "${seg}"` }
    }

    // ── Numeric range: both sides are pure integers ──────────────────────────
    if (/^\d+$/.test(startRaw) && /^\d+$/.test(endRaw)) {
      const s = parseInt(startRaw, 10)
      const e = parseInt(endRaw, 10)
      if (e < s) return { identifiers: [], error: `End of range must be ≥ start: "${seg}"` }
      if (e - s > 999) return { identifiers: [], error: `Range too large (max 1000 per segment): "${seg}"` }
      for (let i = s; i <= e; i++) identifiers.push(String(i))
      continue
    }

    // ── Alpha-suffix range: {numericPrefix}{Letter} ──────────────────────────
    // e.g. "56A"-"56D"  or  "ROOM101A"-"ROOM101F"
    const alphaSuffix = /^(.*?)([A-Z])$/
    const sMatch = alphaSuffix.exec(startRaw)
    const eMatch = alphaSuffix.exec(endRaw)

    if (sMatch && eMatch) {
      const prefix = sMatch[1]
      if (prefix !== eMatch[1]) {
        return { identifiers: [], error: `Prefix mismatch in range "${seg}": "${sMatch[1]}" vs "${eMatch[1]}"` }
      }
      const sc = sMatch[2].charCodeAt(0)  // e.g. 'A' = 65
      const ec = eMatch[2].charCodeAt(0)
      if (ec < sc) return { identifiers: [], error: `End letter must be ≥ start letter in range: "${seg}"` }
      if (ec - sc > 25) return { identifiers: [], error: `Letter range spans more than the alphabet: "${seg}"` }
      for (let c = sc; c <= ec; c++) identifiers.push(prefix + String.fromCharCode(c))
      continue
    }

    return { identifiers: [], error: `Cannot parse segment: "${seg}". Use formats like "101-150", "56A-56D", or "101,102,103".` }
  }

  // Deduplicate while preserving order
  const seen = new Set<string>()
  const unique: string[] = []
  for (const id of identifiers) {
    if (!seen.has(id)) { seen.add(id); unique.push(id) }
  }

  if (unique.length === 0) return { identifiers: [], error: 'No unit identifiers found in input.' }
  if (unique.length > 1000) return { identifiers: [], error: `Too many units (${unique.length}). Maximum is 1000 per bulk import.` }

  return { identifiers: unique }
}

/**
 * Returns a human-readable label for a property type.
 */
export function unitLabel(propertyType: string): string {
  if (propertyType === 'hospitality') return 'Room / Suite'
  return 'Unit / Apartment'
}

export function unitsLabel(propertyType: string): string {
  if (propertyType === 'hospitality') return 'Rooms / Suites'
  return 'Units'
}
