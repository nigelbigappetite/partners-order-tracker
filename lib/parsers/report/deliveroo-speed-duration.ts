import { DeliverooSpeedDurationResult } from './types'
import { parseCSV, parseNum, findCol, avg } from './csv-utils'

export function parseDeliverooSpeedDuration(csvText: string): DeliverooSpeedDurationResult {
  const { headers, rows } = parseCSV(csvText)
  const durationIdx = findCol(headers, 'avg total order duration', 'average total order duration', 'order duration (mins)', 'total order duration (mins)', 'average order duration')
  const vals: number[] = []
  for (const row of rows) {
    const v = durationIdx >= 0 ? parseNum(row[durationIdx]) : 0
    if (v > 0) vals.push(v)
  }
  return { avgDurationMins: Math.round(avg(vals) * 100) / 100 }
}
