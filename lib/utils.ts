// Utility functions

export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return '£0.00'
  return `£${numAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatCurrencyNoDecimals(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return '£0'
  return `£${numAmount.toLocaleString('en-GB')}`
}

/**
 * Formats an order ID to always display with exactly one # prefix
 * Removes all existing # symbols and adds a single # at the start
 * Examples: "##1005" -> "#1005", "1005" -> "#1005", "#1005" -> "#1005"
 */
export function formatOrderId(orderId: string): string {
  if (!orderId) return ''
  // Remove all # symbols and trim
  const cleaned = String(orderId).replace(/#/g, '').trim()
  // Add single # prefix
  return `#${cleaned}`
}

