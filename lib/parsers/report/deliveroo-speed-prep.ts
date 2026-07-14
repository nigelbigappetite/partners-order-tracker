import { DeliverooSpeedPrepResult } from './types'
import { parseCSV, parseNum, findCol, avg } from './csv-utils'

export function parseDeliverooSpeedPrep(csvText: string): DeliverooSpeedPrepResult {
  const { headers, rows } = parseCSV(csvText)
  const prepIdx = findCol(headers, 'prep time', 'avg prep time', 'average prep time', 'preparation time (mins)', 'prep time (mins)', 'average preparation time')
  const vals: number[] = []
  for (const row of rows) {
    const v = prepIdx >= 0 ? parseNum(row[prepIdx]) : 0
    if (v > 0) vals.push(v)
  }
  return { avgPrepMins: Math.round(avg(vals) * 100) / 100 }
}
