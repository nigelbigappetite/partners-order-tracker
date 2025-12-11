// Utility functions for location data matching and validation

import { Order, Franchise, OrderLine } from './types'

/**
 * Normalize franchise code for matching (removes spaces, handles variations)
 */
export function normalizeFranchiseCode(code: string): string {
  if (!code) return ''
  // Remove all spaces, convert to uppercase, trim
  return code.replace(/\s+/g, '').toUpperCase().trim()
}

/**
 * Match order to franchise with multiple strategies
 * 1. Exact code match (normalized)
 * 2. Code contains franchise code (e.g., "BOL01" contains "BOL")
 * 3. Franchisee name matches franchise name (fallback)
 */
export function matchOrderToLocation(order: Order, franchise: Franchise): boolean {
  const orderFranchisee = (order.franchisee || '').trim()
  const franchiseCode = (franchise.code || '').trim()
  const franchiseName = (franchise.name || '').trim()

  if (!orderFranchisee || !franchiseCode) {
    // Debug: log why matching failed
    if (process.env.NODE_ENV === 'development' && orderFranchisee && !franchiseCode) {
      console.warn('[matchOrderToLocation] Franchise missing code:', { 
        franchiseName, 
        orderFranchisee 
      })
    }
    return false
  }

  // Strategy 1: Exact normalized code match
  const normalizedOrderCode = normalizeFranchiseCode(orderFranchisee)
  const normalizedFranchiseCode = normalizeFranchiseCode(franchiseCode)
  
  if (normalizedOrderCode === normalizedFranchiseCode) {
    return true
  }

  // Strategy 2: Order code contains franchise code (e.g., "BOL01" contains "BOL")
  // Extract base code (letters only) from franchise code
  const baseFranchiseCode = franchiseCode.match(/^([A-Za-z]+)/)?.[1]?.toUpperCase()
  if (baseFranchiseCode && normalizedOrderCode.includes(baseFranchiseCode)) {
    return true
  }

  // Strategy 3: Franchisee name matches franchise name (case-insensitive)
  const orderFranchiseeLower = orderFranchisee.toLowerCase()
  const franchiseNameLower = franchiseName.toLowerCase()
  
  // Check if names match (exact or contains)
  if (franchiseNameLower && orderFranchiseeLower === franchiseNameLower) {
    return true
  }
  
  // Check if franchise name contains key parts (e.g., "BOLTON" in "CHESTERS- BOLTON")
  if (franchiseNameLower && orderFranchiseeLower.includes(franchiseNameLower)) {
    return true
  }
  
  if (franchiseNameLower && franchiseNameLower.includes(orderFranchiseeLower)) {
    return true
  }

  // Debug: log unmatched cases
  if (process.env.NODE_ENV === 'development') {
    console.warn('[matchOrderToLocation] No match found:', {
      orderFranchisee,
      franchiseCode,
      franchiseName,
      normalizedOrderCode,
      normalizedFranchiseCode,
      baseFranchiseCode,
    })
  }

  return false
}

/**
 * Parse date from various formats (MM/DD/YYYY, DD/MM/YYYY, ISO, etc.)
 */
export function parseOrderDate(dateString: string | undefined): Date | null {
  if (!dateString) return null

  try {
    // Handle MM/DD/YYYY format (most common in Google Sheets)
    if (dateString.includes('/')) {
      const parts = dateString.split('/').map(p => parseInt(p.trim()))
      if (parts.length === 3) {
        const [month, day, year] = parts
        // Assume MM/DD/YYYY format
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year > 2000) {
          return new Date(year, month - 1, day)
        }
        // Try DD/MM/YYYY if first part > 12
        if (month > 12 && day <= 12) {
          return new Date(year, day - 1, month)
        }
      }
    }

    // Try ISO format or standard Date parsing
    const parsed = new Date(dateString)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
  } catch {
    // Invalid date
  }

  return null
}

/**
 * Check if order date is within date range
 */
export function isOrderInDateRange(
  orderDate: string | undefined,
  dateRange: { start: Date; end: Date }
): boolean {
  if (!orderDate) return false

  const parsedDate = parseOrderDate(orderDate)
  if (!parsedDate) return false

  return parsedDate >= dateRange.start && parsedDate <= dateRange.end
}

/**
 * Validate and normalize order line data
 */
export function validateOrderLine(line: OrderLine): {
  isValid: boolean
  normalized: OrderLine
  warnings: string[]
} {
  const warnings: string[] = []
  const normalized: OrderLine = { ...line }

  // Validate and normalize numeric fields
  const lineTotal = Number(line.lineTotal) || 0
  const cogsTotal = Number(line.cogsTotal) || 0
  const quantity = Number(line.quantity) || 0

  if (lineTotal < 0) warnings.push(`Negative lineTotal for order ${line.orderId}`)
  if (cogsTotal < 0) warnings.push(`Negative cogsTotal for order ${line.orderId}`)
  if (quantity < 0) warnings.push(`Negative quantity for order ${line.orderId}`)

  normalized.lineTotal = lineTotal
  normalized.cogsTotal = cogsTotal
  normalized.quantity = quantity

  // Validate required fields
  if (!line.orderId) {
    return { isValid: false, normalized, warnings: [...warnings, 'Missing orderId'] }
  }

  return { isValid: true, normalized, warnings }
}

/**
 * Calculate location metrics from filtered order lines
 */
export function calculateLocationMetrics(orderLines: OrderLine[]): {
  totalRevenue: number
  totalCOGS: number
  totalItems: number
  orderIds: Set<string>
  warnings: string[]
} {
  const orderIds = new Set<string>()
  let totalRevenue = 0
  let totalCOGS = 0
  let totalItems = 0
  const warnings: string[] = []

  orderLines.forEach((line) => {
    const validation = validateOrderLine(line)
    if (!validation.isValid) {
      warnings.push(...validation.warnings)
      return
    }

    if (validation.warnings.length > 0) {
      warnings.push(...validation.warnings)
    }

    const normalized = validation.normalized
    totalRevenue += normalized.lineTotal
    totalCOGS += normalized.cogsTotal || 0
    totalItems += normalized.quantity
    orderIds.add(normalized.orderId)
  })

  return {
    totalRevenue,
    totalCOGS,
    totalItems,
    orderIds,
    warnings,
  }
}

