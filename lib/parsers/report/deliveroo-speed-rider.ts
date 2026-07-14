import { DeliverooSpeedRiderResult } from './types'
import { parseCSV, parseNum, parsePct, findCol, avg } from './csv-utils'

export function parseDeliverooSpeedRider(csvText: string): DeliverooSpeedRiderResult {
  const { headers, rows } = parseCSV(csvText)
  const waitIdx = findCol(headers, 'rider wait past target', 'avg rider wait', 'rider wait (mins)', 'rider wait time (mins)', 'average rider wait')
  const over5Idx = findCol(headers, 'rider wait > 5 mins (%)', 'rider wait >5 min %', 'over 5 min %', '> 5 mins', '>5 min')
  const over10Idx = findCol(headers, 'rider wait > 10 mins (%)', 'rider wait >10 min %', 'over 10 min %', '> 10 mins', '>10 min')

  const waitVals: number[] = []
  const over5Vals: number[] = []
  const over10Vals: number[] = []

  for (const row of rows) {
    if (waitIdx >= 0) { const v = parseNum(row[waitIdx]); if (v >= 0) waitVals.push(v) }
    if (over5Idx >= 0) { const v = parsePct(row[over5Idx]); if (v >= 0) over5Vals.push(v) }
    if (over10Idx >= 0) { const v = parsePct(row[over10Idx]); if (v >= 0) over10Vals.push(v) }
  }

  return {
    avgRiderWaitMins: Math.round(avg(waitVals) * 100) / 100,
    over5Pct: Math.round(avg(over5Vals) * 100) / 100,
    over10Pct: Math.round(avg(over10Vals) * 100) / 100,
  }
}
