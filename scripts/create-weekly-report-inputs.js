const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const REPORT_INPUTS = path.join(ROOT, 'report-inputs')
const TEMPLATE_WEEK = '_template'
const DEFAULT_SOURCE_WEEK = 'week_2026-06-22'

function toISODate(date) {
  return date.toISOString().slice(0, 10)
}

function toUKDate(date) {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  return `${day}/${month}/${year}`
}

function toShortUKRange(startDate) {
  const endDate = new Date(startDate)
  endDate.setUTCDate(endDate.getUTCDate() + 6)
  const formatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const start = formatter.format(startDate).replace(',', '')
  const end = formatter.format(endDate).replace(',', '')
  return `${start} - ${end}`
}

function mondayFor(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d
}

function parseDateArg(arg) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
    return new Date(`${arg}T12:00:00Z`)
  }
  const ukMatch = arg.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (ukMatch) {
    const [, day, month, year] = ukMatch
    return new Date(`${year}-${month}-${day}T12:00:00Z`)
  }
  throw new Error('Week start must be YYYY-MM-DD or UK format DD/MM/YYYY, for example: 2026-07-06 or 06/07/2026')
}

function parseWeekStart() {
  const arg = process.argv[2]
  if (!arg) return toISODate(mondayFor(new Date()))
  const d = parseDateArg(arg)
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${arg}`)
  if (d.getUTCDay() !== 1) throw new Error(`${arg} is not a Monday`)
  return toISODate(d)
}

function latestSourceWeek() {
  if (!fs.existsSync(REPORT_INPUTS)) return TEMPLATE_WEEK
  const weeks = fs.readdirSync(REPORT_INPUTS)
    .filter((name) => /^week_\d{4}-\d{2}-\d{2}$/.test(name))
    .sort()
  if (weeks.length > 0) return weeks[weeks.length - 1]
  if (fs.existsSync(path.join(REPORT_INPUTS, TEMPLATE_WEEK))) return TEMPLATE_WEEK
  return DEFAULT_SOURCE_WEEK
}

function copyGuidanceFile(sourceFile, targetFile, sourceWeekStart, targetWeekStart) {
  if (!fs.existsSync(sourceFile)) return
  let content = fs.readFileSync(sourceFile, 'utf8')
  const sourceDate = sourceWeekStart.replace('week_', '')
  const targetDate = targetWeekStart.replace('week_', '')
  const targetDateObj = new Date(`${targetDate}T12:00:00Z`)
  const targetUKDate = toUKDate(targetDateObj)
  const targetUKRange = toShortUKRange(targetDateObj)

  if (sourceWeekStart !== TEMPLATE_WEEK) {
    const sourceDateObj = new Date(`${sourceDate}T12:00:00Z`)
    const sourceUKDate = toUKDate(sourceDateObj)
    const sourceUKRange = toShortUKRange(sourceDateObj)
    content = content
      .replaceAll(sourceDate, targetDate)
      .replaceAll(sourceDate.split('-').reverse().join('-'), targetDate.split('-').reverse().join('-'))
      .replaceAll(sourceUKDate, targetUKDate)
      .replaceAll(sourceUKRange, targetUKRange)
  }

  content = content
    .replaceAll('TEMPLATE_WEEK_START_UK', targetUKDate)
    .replaceAll('TEMPLATE_WEEK_RANGE_UK', targetUKRange)
    .replaceAll('TEMPLATE_WEEK_START_ISO', targetDate)
    .replace(/Week \d{4}-\d{2}-\d{2} week/g, `Week commencing ${targetUKDate}`)
    .replace(/week \d{4}-\d{2}-\d{2}/g, `week commencing ${targetUKDate}`)
    .replace(/Status for week commencing \d{2}\/\d{2}\/\d{4}/g, `Status for week commencing ${targetUKDate}`)
    .replace(/Data collected for week commencing \d{2}\/\d{2}\/\d{4}/g, `Data collected for week commencing ${targetUKDate}`)
    .replaceAll('22–28 Jun 2026', targetUKRange)
    .replaceAll('22-28 june', targetUKDate)
    .replaceAll('22–28 Jun', targetUKRange)
    .replace(/^# Weekly Report Data Map .*/m, `# Weekly Report Data Map - week commencing ${targetUKDate}`)
  fs.writeFileSync(targetFile, content)
}

function main() {
  const weekStart = parseWeekStart()
  const targetWeek = `week_${weekStart}`
  const sourceWeek = latestSourceWeek()
  const sourceRoot = path.join(REPORT_INPUTS, sourceWeek)
  const targetRoot = path.join(REPORT_INPUTS, targetWeek)

  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Source template folder not found: ${sourceRoot}`)
  }
  if (fs.existsSync(targetRoot)) {
    console.log(`Already exists: ${targetRoot}`)
    return
  }

  fs.mkdirSync(targetRoot, { recursive: true })
  copyGuidanceFile(
    path.join(sourceRoot, 'DATA-MAP.md'),
    path.join(targetRoot, 'DATA-MAP.md'),
    sourceWeek,
    targetWeek
  )

  const dirs = fs.readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  for (const dir of dirs) {
    const srcDir = path.join(sourceRoot, dir)
    const dstDir = path.join(targetRoot, dir)
    fs.mkdirSync(dstDir, { recursive: true })
    copyGuidanceFile(
      path.join(srcDir, 'README.md'),
      path.join(dstDir, 'README.md'),
      sourceWeek,
      targetWeek
    )
    fs.writeFileSync(path.join(dstDir, '.gitkeep'), '')
  }

  console.log(`Created ${targetRoot}`)
  console.log(`Week commencing ${toUKDate(new Date(`${weekStart}T12:00:00Z`))}`)
  console.log('Fill each site/platform folder with the week exports, then ask the IDE to generate the HTML report.')
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
