import { UberSalesOverTimeResult } from './types'
import { parseCSV, parseMoney, parseNum, parseDDMMYYYY, findCol } from './csv-utils'

/**
 * Parses Uber Eats "sales-over-time" CSV.
 * The CSV has rows for each day with a period label (This period / Last period).
 * Columns: Date, Period, Gross Sales (incl. VAT), Order count (or similar)
 */
export function parseUberSalesOverTime(csvText: string): UberSalesOverTimeResult {
  const { headers, rows } = parseCSV(csvText)

  const dateIdx = findCol(headers, 'date', 'order date', 'day')
  const periodIdx = findCol(headers, 'period', 'time period')
  const salesIdx = findCol(headers, 'gross sales (incl. vat)', 'gross sales', 'sales (incl. vat)', 'sales', 'revenue')
  const ordersIdx = findCol(headers, 'order count', 'orders', 'total orders', 'number of orders')

  const thisDays: Array<{ date: string; sales: number; orders: number }> = []
  let thisPeriodTotal = 0
  let lastPeriodTotal = 0

  for (const row of rows) {
    const dateStr = row[dateIdx]?.trim() || ''
    const period = row[periodIdx]?.trim().toLowerCase() || ''
    const sales = salesIdx >= 0 ? parseMoney(row[salesIdx]) : 0
    const orders = ordersIdx >= 0 ? parseNum(row[ordersIdx]) : 0

    const date = parseDDMMYYYY(dateStr) || dateStr

    if (period.includes('last') || period.includes('prior') || period.includes('previous')) {
      lastPeriodTotal += sales
    } else {
      // This period (or default)
      if (date) {
        thisDays.push({ date, sales, orders })
        thisPeriodTotal += sales
      }
    }
  }

  // Sort by date
  thisDays.sort((a, b) => a.date.localeCompare(b.date))

  return { days: thisDays, thisPeriodTotal, lastPeriodTotal }
}
