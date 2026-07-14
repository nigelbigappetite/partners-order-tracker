import { JustEatPdfResult } from './types'

/**
 * Parses Just Eat invoice HTML (.doc files are actually HTML).
 * Ported from hungry-tum-invoicing src/lib/parsers/html-parser.ts
 */
export function parseJustEatPdf(htmlContent: string): JustEatPdfResult {
  // Strip HTML tags to get plain text
  const text = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/&pound;/g, '£')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(td|tr|th|div|p|span|table|tbody|thead)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // "Total sales £X"
  const totalSalesMatch = text.match(/Total\s+sales\s*£([\d,]+\.?\d*)/i)
  const totalSalesPeriod = text.match(/Total\s+sales\s+this\s+period[\s\S]*?£([\d,]+\.?\d*)/i)
  const grossOrderValue = text.match(/Gross\s+Order\s+Value\s+of\s+£([\d,]+\.?\d*)/i)

  const grossSalesStr = totalSalesMatch?.[1] ?? totalSalesPeriod?.[1] ?? grossOrderValue?.[1] ?? '0'
  const grossSales = parseFloat(grossSalesStr.replace(/,/g, '')) || 0

  const netPayoutMatch = text.match(/[Yy]ou\s+will\s+receive\s+from\s+Just\s+Eat\s*£([\d,]+\.?\d*)/i)
  const netPayout = netPayoutMatch ? parseFloat(netPayoutMatch[1].replace(/,/g, '')) : 0

  const commissionFull = text.match(/[Cc]ommission[^£]*£[\d,]+\.?\d*[^£]*£([\d,]+\.?\d*)/)
  const commissionSimple = text.match(/[Cc]ommission\s*£([\d,]+\.?\d*)/)
  const commissionMatch = commissionFull ?? commissionSimple
  const commission = commissionMatch ? parseFloat(commissionMatch[1].replace(/,/g, '')) : 0

  const orderCountMatch = text.match(/Number\s+of\s+orders\s+(\d+)/i)
  const orders = orderCountMatch ? parseInt(orderCountMatch[1]) : 0

  return {
    grossSales: Math.round(grossSales * 100) / 100,
    orders,
    netPayout: Math.round(netPayout * 100) / 100,
    commission: Math.round(commission * 100) / 100,
  }
}
