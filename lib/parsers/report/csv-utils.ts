export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    if (char === '"') {
      if (inQuotes && nextChar === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim()); current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase())
  const rows = lines.slice(1).map((l) => parseCSVLine(l))
  return { headers, rows }
}

export function parseMoney(value: string | undefined): number {
  if (!value) return 0
  const trimmed = value.trim().replace(/£/g, '').replace(/,/g, '')
  if (!trimmed) return 0
  const isNeg = trimmed.startsWith('(') && trimmed.endsWith(')')
  const parsed = parseFloat(trimmed.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(parsed)) return 0
  return isNeg ? -Math.abs(parsed) : parsed
}

export function parseNum(value: string | undefined): number {
  if (!value) return 0
  const parsed = parseFloat(value.trim().replace(/,/g, '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function parsePct(value: string | undefined): number {
  if (!value) return 0
  return parseNum(value.replace('%', ''))
}

/** DD/MM/YYYY → YYYY-MM-DD */
export function parseDDMMYYYY(dateStr: string): string {
  // Handle DD/MM/YYYY HH:MM format
  const datePart = dateStr.split(' ')[0]
  const parts = datePart.split('/')
  if (parts.length !== 3) return ''
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function findCol(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const lname = name.toLowerCase()
    const idx = headers.findIndex(h => h === lname)
    if (idx >= 0) return idx
  }
  // Partial match fallback
  for (const name of names) {
    const lname = name.toLowerCase()
    const idx = headers.findIndex(h => h.includes(lname) || lname.includes(h))
    if (idx >= 0) return idx
  }
  return -1
}

export function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

const normalizeForFilter = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Builds a two-pass site filter function for multi-site Uber CSV files.
 *
 * Pass 1 (strict): row matches if restaurant name equals/contains the filter
 *   OR contains all significant words (>5 chars, e.g. 'chatham') from the filter.
 *   Prevents "Wing Shack Co" (Loughton) rows from matching a Chatham filter.
 *
 * Pass 2 (prefix fallback): if ZERO rows pass strict, match rows where the filter
 *   starts with the restaurant name — handles sites where Uber omits the location
 *   suffix (e.g. Loughton's rows are "Wing Shack Co", filter is "Wing Shack Co- Loughton").
 *
 * @param siteNameFilter  kitchenLocation or displayName from BrandDefinition
 * @param restaurantIdx   column index of the restaurant/shop-name column (-1 = no filter)
 * @param rows            all CSV data rows (used internally for the strict first-pass check)
 */
export function buildSiteFilter(
  siteNameFilter: string | undefined,
  restaurantIdx: number,
  rows: string[][]
): (row: string[]) => boolean {
  if (!siteNameFilter || restaurantIdx < 0) return () => true

  const normFilter = normalizeForFilter(siteNameFilter)
  const sig = normFilter.split(' ').filter(w => w.length > 5)

  const strictMatch = (row: string[]): boolean => {
    const normRest = normalizeForFilter(row[restaurantIdx]?.trim() || '')
    const exactOrContains = normRest === normFilter || normRest.includes(normFilter)
    const hasSig = sig.length > 0
      ? sig.every(w => normRest.includes(w))
      : normFilter.includes(normRest)
    return exactOrContains || hasSig
  }

  if (rows.some(strictMatch)) return strictMatch

  // Prefix fallback: restaurant name is the base brand name, filter has extra location suffix
  return (row: string[]) => {
    const normRest = normalizeForFilter(row[restaurantIdx]?.trim() || '')
    return normRest.length >= 5 && normFilter.startsWith(normRest)
  }
}
