import { DeliverooSpeedBusyResult } from './types'
import { parseCSV, parseNum, parsePct, findCol, avg } from './csv-utils'

export function parseDeliverooSpeedBusy(csvText: string): DeliverooSpeedBusyResult {
  const { headers, rows } = parseCSV(csvText)
  const busyIdx = findCol(headers, 'busy mode (%)', 'busy mode %', 'busy mode usage', 'busy mode', '% in busy mode')
  const vals: number[] = []
  for (const row of rows) {
    const v = busyIdx >= 0 ? parsePct(row[busyIdx]) : 0
    if (v >= 0) vals.push(v)
  }
  return { busyModePct: Math.round(avg(vals) * 100) / 100 }
}
