import fs from 'fs'
import path from 'path'
import { WeeklyReportData } from '@/lib/parsers/report/types'

function logoDataUri(publicPath: string): string {
  try {
    const filePath = path.join(process.cwd(), 'public', publicPath.replace(/^\//, ''))
    const buf = fs.readFileSync(filePath)
    const ext = path.extname(publicPath).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
    }
    const mime = mimeMap[ext] ?? 'image/png'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return publicPath
  }
}

function fmt(n: number): string {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmt2(n: number): string {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtN(n: number): string {
  return n.toLocaleString('en-GB', { maximumFractionDigits: 2 })
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function dayLabel(date: string): string {
  const d = new Date(date + 'T12:00:00')
  const name = d.toLocaleDateString('en-GB', { weekday: 'short' })
  return `${name} ${d.getDate()}`
}

function monthLabel(date: string): string {
  const d = new Date(date + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function dateRange(weekStart: string, weekEnd: string): string {
  const s = new Date(weekStart + 'T12:00:00')
  const e = new Date(weekEnd + 'T12:00:00')
  const sd = s.getDate()
  const ed = e.getDate()
  const sm = s.toLocaleDateString('en-GB', { month: 'short' })
  const em = e.toLocaleDateString('en-GB', { month: 'short' })
  const year = e.getFullYear()
  if (sm === em) return `${sd}–${ed} ${em} ${year}`
  return `${sd} ${sm} – ${ed} ${em} ${year}`
}

function wowArrow(pct: number | null): string {
  if (pct == null) return ''
  return pct >= 0 ? '↑' : '↓'
}

function wowColor(pct: number | null): string {
  if (pct == null) return '#171717'
  return pct >= 0 ? '#bbf7d0' : '#fca5a5'
}

function pctColor(pct: number | null): string {
  if (pct == null) return '#171717'
  return pct >= 0 ? '#15803d' : '#dc2626'
}

function speedDotClass(val: number, goodThreshold: number, watchThreshold: number): string {
  if (val <= goodThreshold) return 'dot-good'
  if (val <= watchThreshold) return 'dot-ok'
  return 'dot-watch'
}

function speedValClass(val: number, goodThreshold: number, watchThreshold: number): string {
  if (val <= goodThreshold) return 'speed-val-good'
  if (val <= watchThreshold) return ''
  return 'speed-val-watch'
}

function stars(rating: number): string {
  const full = Math.floor(rating)
  return '⭐'.repeat(Math.min(full, 5))
}

function platformLabel(p: 'uber_eats' | 'deliveroo' | 'just_eat'): string {
  if (p === 'uber_eats') return 'Uber Eats'
  if (p === 'deliveroo') return 'Deliveroo'
  return 'Just Eat'
}

function platformColor(p: 'uber_eats' | 'deliveroo' | 'just_eat'): string {
  if (p === 'uber_eats') return '#ff7426'
  if (p === 'deliveroo') return '#00ccbc'
  return '#ff8000'
}

function platformBubbleColors(p: 'uber_eats' | 'deliveroo' | 'just_eat'): { bg: string; color: string } {
  if (p === 'uber_eats') return { bg: '#ff7426', color: 'white' }
  if (p === 'deliveroo') return { bg: '#ffabea', color: '#11140d' }
  return { bg: '#ffc43d', color: '#11140d' }
}

function generateFocusItems(data: WeeklyReportData): Array<{ action: string; desc: string }> {
  const items: Array<{ action: string; desc: string }> = []
  const { snapshot, speed, reviews, dailyRhythm, platforms } = data

  // 1. Top item quality if flagged
  const flaggedItems = reviews.flaggedItems.slice(0, 1)
  if (flaggedItems.length > 0) {
    const fi = flaggedItems[0]
    items.push({
      action: `Fix quality issue: ${fi.item}`,
      desc: `${fi.issue}. Check serving temperature, packaging, and consistency before every dispatch. Quality fixes are the fastest way to protect the rating.`,
    })
  }

  // 2. Speed watchpoint
  if (speed.uber) {
    const u = speed.uber
    if (u.courierWaitMins > 5 || u.orderDurationMins > 40) {
      items.push({
        action: 'Reduce Uber courier wait and order duration',
        desc: `Average courier wait was ${fmtN(u.courierWaitMins)} mins${u.avoidableWaitMins > 2 ? ` with ${fmtN(u.avoidableWaitMins)} mins avoidable` : ''}. Total order duration averaged ${fmtN(u.orderDurationMins)} mins. Tightening dispatch timing will protect the Uber rating.`,
      })
    }
  }

  // 3. Peak days preparation
  const sorted = [...dailyRhythm].sort(
    (a, b) => (b.uberSales + b.deliverooSales + b.jeSales) - (a.uberSales + a.deliverooSales + a.jeSales)
  )
  if (sorted.length >= 2) {
    const top2 = sorted.slice(0, 2).map(d => dayLabel(d.date))
    const topItem = data.items.find(i => i.platform === 'uber_eats')
    items.push({
      action: `Stock up for ${top2.join(' & ')} peaks`,
      desc: `${top2[0]} was the peak sales day at ${fmt(sorted[0].uberSales + sorted[0].deliverooSales + sorted[0].jeSales)}. ${topItem ? `Run higher stock on ${topItem.name} and other top items on the busiest days.` : 'Ensure prep volumes match the demand pattern from this week.'}`,
    })
  }

  // 4. Platform-specific insight
  if (platforms.length > 1) {
    const sorted = [...platforms].sort((a, b) => b.sales - a.sales)
    const leader = sorted[0]
    const trailer = sorted[sorted.length - 1]
    if (trailer.sales > 0 && leader.sales / trailer.sales > 2) {
      items.push({
        action: `Grow ${platformLabel(trailer.platform)} presence`,
        desc: `${platformLabel(leader.platform)} drove ${Math.round((leader.sales / (leader.sales + trailer.sales)) * 100)}% of this week's sales. ${platformLabel(trailer.platform)} is underperforming — review menu coverage, photos and pricing on that platform.`,
      })
    } else {
      // Deliveroo speed if good
      if (data.speed.deliveroo && data.speed.deliveroo.orderDurationMins < 35) {
        items.push({
          action: `Maintain Deliveroo speed standards`,
          desc: `Deliveroo order duration averaged ${fmtN(data.speed.deliveroo.orderDurationMins)} mins — keep this consistent. Rider wait over 5 mins was ${fmtN(data.speed.deliveroo.riderWaitOver5Pct)}%. Good speed scores protect ranking and reduce cancellations.`,
        })
      }
    }
  }

  return items.slice(0, 4)
}

function generatePulseHeadline(data: WeeklyReportData): string {
  const { snapshot, speed, reviews, ads } = data
  const parts: string[] = []

  if (snapshot.wowGrossPct != null && snapshot.wowGrossPct > 20) {
    parts.push('Strong demand week.')
  } else if (snapshot.wowGrossPct != null && snapshot.wowGrossPct < -10) {
    parts.push('Quieter week than last.')
  } else {
    parts.push('Solid week.')
  }

  if (speed.uber && (speed.uber.courierWaitMins > 5 || speed.uber.orderDurationMins > 40)) {
    parts.push('Speed and courier wait need attention.')
  } else if (reviews.flaggedItems.length > 0) {
    parts.push('Quality flagged on one item — fix the packaging and temperature.')
  } else {
    parts.push('Kitchen ran cleanly — keep the consistency.')
  }

  return parts.join(' ')
}

function generatePulseTiles(data: WeeklyReportData): string {
  const { snapshot, platforms, ads, speed, reviews } = data

  const uberPlatform = platforms.find(p => p.platform === 'uber_eats')
  const delPlatform = platforms.find(p => p.platform === 'deliveroo')
  const uberOrders = uberPlatform?.orders ?? 0
  const delOrders = delPlatform?.orders ?? 0
  const dominantPlatformData = [...platforms].sort((a, b) => b.sales - a.sales)[0]

  const tile1 = `
    <div class="tile t-cream">
      <div class="tile-icon">🛍️</div>
      <p class="tile-h">${snapshot.orders} orders fulfilled</p>
      <p class="tile-p">${uberOrders > 0 ? `${uberOrders} came through Uber Eats` : ''}${uberOrders > 0 && delOrders > 0 ? ' and ' : ''}${delOrders > 0 ? `${delOrders} through Deliveroo` : ''}. Build your prep volumes around this — the trend is ${(snapshot.wowGrossPct ?? 0) >= 0 ? 'upward' : 'worth monitoring'}.</p>
    </div>`

  const topItem = data.items.find(i => i.platform === (dominantPlatformData?.platform ?? 'uber_eats')) ?? data.items[0]
  const bundleItems = data.items.filter(i => i.isBundle)
  const hasItems = data.items.length > 0
  const tile2 = hasItems ? `
    <div class="tile t-pink">
      <div class="tile-icon">🧺</div>
      <p class="tile-h">${topItem ? `${topItem.name} leading sales` : 'Top items driving revenue'}</p>
      <p class="tile-p">${bundleItems.length > 0 ? `${bundleItems.map(b => b.name).slice(0, 2).join(' and ')} are pulling basket size up. ` : ''}${dominantPlatformData && dominantPlatformData.aov > 0 ? `${platformLabel(dominantPlatformData.platform)} average order was ${fmt2(dominantPlatformData.aov)}.` : ''} Keep top item components prepped and consistent.</p>
    </div>` : `
    <div class="tile t-pink">
      <div class="tile-icon">🧺</div>
      <p class="tile-h">Item data not uploaded this week</p>
      <p class="tile-p">Upload the Uber sales-leaderboard CSV and Deliveroo items-sold report next week to see which items are driving revenue and where to focus stock prep.</p>
    </div>`

  const bestRoas = Math.max(ads.uber?.roas ?? 0, ads.deliveroo?.roas ?? 0, ads.justEat?.roas ?? 0)
  const adsWorked = bestRoas > 4
  const hasAds = !!(ads.uber || ads.deliveroo || ads.justEat)
  const tile3 = hasAds ? `
    <div class="tile t-blue">
      <div class="tile-icon">📣</div>
      <p class="tile-h">${adsWorked ? `Ads returned ${fmtN(bestRoas)}× ROAS` : 'Ads running this week'}</p>
      <p class="tile-p">${ads.uber ? `Uber ad spend of ${fmt2(ads.uber.spend)} drove ${ads.uber.orders} attributed orders. ` : ''}${ads.deliveroo ? `Deliveroo ads spent ${fmt2(ads.deliveroo.spend)}.` : ''} When ads are on, the kitchen needs to be ready for demand.</p>
    </div>` : `
    <div class="tile t-blue">
      <div class="tile-icon">📣</div>
      <p class="tile-h">No active ad campaigns this week</p>
      <p class="tile-p">Organic orders only this week. Running targeted promotions on Uber and Deliveroo during peak hours can significantly increase order volume — consider activating campaigns for the busiest trading days.</p>
    </div>`

  const hasSpeedIssue = speed.uber && (speed.uber.courierWaitMins > 5 || speed.uber.orderDurationMins > 40)
  const hasFlagged = reviews.flaggedItems.length > 0
  const hasSpeedData = !!(speed.uber || speed.deliveroo)
  const tile4 = `
    <div class="tile t-ink">
      <div class="tile-icon">${hasSpeedIssue || hasFlagged ? '⚠️' : hasSpeedData ? '✅' : '📋'}</div>
      <p class="tile-h">${hasSpeedIssue ? 'Speed and courier wait to improve' : hasFlagged ? 'Item quality flagged' : hasSpeedData ? 'Clean fulfilment this week' : 'Speed data not available'}</p>
      <p class="tile-p">${hasSpeedIssue ? `Uber total order duration averaged ${fmtN(speed.uber!.orderDurationMins)} mins. ` : ''}${hasFlagged ? `${reviews.flaggedItems[0].item}: ${reviews.flaggedItems[0].issue}.` : ''}${!hasSpeedIssue && !hasFlagged && hasSpeedData ? 'No inaccurate orders flagged and speed metrics were within targets. Keep this standard going.' : ''}${!hasSpeedData ? 'Upload the Uber order history CSV next week to track courier wait, prep time and order duration.' : ''}${(hasSpeedIssue || hasFlagged) ? ' These are the priority fixes for next week.' : ''}</p>
    </div>`

  return tile1 + tile2 + tile3 + tile4
}

function generateDailyRhythm(data: WeeklyReportData): string {
  const { dailyRhythm } = data
  const maxTotal = Math.max(...dailyRhythm.map(d => d.uberSales + d.deliverooSales + d.jeSales), 1)
  const hasDeliveroo = dailyRhythm.some(d => d.deliverooSales > 0)
  const hasJe = dailyRhythm.some(d => d.jeSales > 0)
  const bestDate = data.snapshot.bestDay

  const allTotals = dailyRhythm.map(d => d.uberSales + d.deliverooSales + d.jeSales)
  const bestOrdersDay = dailyRhythm.reduce((best, d) => {
    const total = d.uberOrders + d.deliverooOrders + d.jeOrders
    const bestTotal = best.uberOrders + best.deliverooOrders + best.jeOrders
    return total > bestTotal ? d : best
  }, dailyRhythm[0])

  const rows = dailyRhythm.map((d, i) => {
    const total = d.uberSales + d.deliverooSales + d.jeSales
    const pct = Math.round((total / maxTotal) * 100)
    const totalOrders = d.uberOrders + d.deliverooOrders + d.jeOrders
    const isBest = d.date === bestDate
    const isLast = i === dailyRhythm.length - 1

    const bars: string[] = []
    if (d.uberSales > 0) bars.push(`<div style="flex:${d.uberSales};background:#ff7426;"></div>`)
    if (d.deliverooSales > 0) bars.push(`<div style="flex:${d.deliverooSales};background:#00ccbc;"></div>`)
    if (d.jeSales > 0) bars.push(`<div style="flex:${d.jeSales};background:#ff8000;"></div>`)
    if (bars.length === 0) bars.push(`<div style="flex:1;background:#ece6d4;"></div>`)

    return `
          <div class="rhythm-row"${isLast ? ' style="margin-bottom:0;"' : ''}>
            <p class="rhythm-day">${dayLabel(d.date)}${isBest ? ' ★' : ''}</p>
            <div>
              <div class="rhythm-track">
                <div style="height:100%;width:${pct}%;border-radius:9999px;overflow:hidden;display:flex;">
                  ${bars.join('')}
                </div>
              </div>
            </div>
            <div class="rhythm-val">
              <span>${fmt(total)}</span>
              <span style="font-size:11px;font-weight:600;color:#6f7169;">${totalOrders} order${totalOrders !== 1 ? 's' : ''}</span>
            </div>
          </div>`
  }).join('')

  const legendItems: string[] = [
    `<div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:12px;border-radius:3px;background:#ff7426;"></div><span style="font-size:11px;font-weight:700;color:#4e5148;">Uber Eats</span></div>`,
  ]
  if (hasDeliveroo) legendItems.push(`<div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:12px;border-radius:3px;background:#00ccbc;"></div><span style="font-size:11px;font-weight:700;color:#4e5148;">Deliveroo</span></div>`)
  if (hasJe) legendItems.push(`<div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:12px;border-radius:3px;background:#ff8000;"></div><span style="font-size:11px;font-weight:700;color:#4e5148;">Just Eat</span></div>`)

  const peakOrdersDay = bestOrdersDay
  const peakOrdersTotal = peakOrdersDay.uberOrders + peakOrdersDay.deliverooOrders + peakOrdersDay.jeOrders

  return `
        <div class="rhythm-card">
          <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;">
            ${legendItems.join('\n            ')}
          </div>
          ${rows}
          <div class="rhythm-footer">
            <span class="tag tag-orange">★ Best day</span>
            <span style="font-size:13px;font-weight:600;color:#4e5148;">${dayLabel(bestDate)} · ${fmt(data.snapshot.bestDayAmount)}</span>
            <span class="tag tag-muted" style="margin-left:6px;">Peak orders</span>
            <span style="font-size:13px;font-weight:600;color:#4e5148;">${dayLabel(peakOrdersDay.date)} · ${peakOrdersTotal}</span>
          </div>
        </div>`
}

function generateChannelMix(data: WeeklyReportData): string {
  const { platforms } = data
  if (platforms.length === 0) return '<p style="color:rgba(255,255,255,0.5);">No platform data available.</p>'

  const totalSales = platforms.reduce((s, p) => s + p.sales, 0)

  const circles = platforms.map(p => {
    const pct = totalSales > 0 ? Math.round((p.sales / totalSales) * 100) : 0
    const { bg, color } = platformBubbleColors(p.platform)
    return `
          <div class="plat-circle" style="background:${bg};color:${color};">
            <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:${color === 'white' ? 'rgba(255,255,255,0.8)' : color};">${platformLabel(p.platform)}</p>
            <p style="font-size:3.5rem;font-weight:700;line-height:1;margin-top:8px;">${pct}%</p>
            <p style="font-size:13px;font-weight:700;margin-top:12px;">${p.orders} orders · ${fmt(p.sales)}</p>
          </div>`
  }).join('')

  const bars = platforms.map(p => {
    const pct = totalSales > 0 ? Math.round((p.sales / totalSales) * 100) : 0
    return `
          <div class="plat-bar-row"${p === platforms[platforms.length - 1] ? ' style="margin-bottom:0;"' : ''}>
            <div class="plat-bar-meta"><span>${platformLabel(p.platform)}</span><span>${fmt2(p.sales)} · ${fmt2(p.aov)} AOV</span></div>
            <div class="plat-track"><div class="plat-fill" style="width:${pct}%;background:${platformColor(p.platform)};"></div></div>
          </div>`
  }).join('')

  // Insight text — use actual dominant platform, not assumed Uber
  const dominant = [...platforms].sort((a, b) => b.sales - a.sales)[0]
  const dominantPct = Math.round((dominant.sales / totalSales) * 100)
  const others = platforms.filter(p => p !== dominant)
  const insight = dominantPct > 55
    ? `${platformLabel(dominant.platform)} drove ${dominantPct}% of sales this week. ${others.map(p => `${platformLabel(p.platform)} contributed ${p.orders} orders.`).join(' ')}`
    : `Sales were split across ${platforms.length} platforms this week. ${platformLabel(dominant.platform)} led with ${dominantPct}%.`

  return `
        <div class="g2">
          ${circles}
        </div>
        <div class="plat-bars">
          ${bars}
          <p style="margin-top:16px;font-size:12px;font-weight:500;color:rgba(255,255,255,0.38);line-height:1.6;">${insight}</p>
        </div>`
}

function generateItemWinners(data: WeeklyReportData): string {
  const uberItems = data.items.filter(i => i.platform === 'uber_eats').slice(0, 5)
  const delItems = data.items.filter(i => i.platform === 'deliveroo').slice(0, 3)
  const jeItems = data.items.filter(i => i.platform === 'just_eat').slice(0, 3)

  if (uberItems.length === 0 && delItems.length === 0 && jeItems.length === 0) {
    return '<p style="color:#4e5148;">No item data available for this week.</p>'
  }

  function renderItems(items: WeeklyReportData['items']): string {
    return items.map((item, idx) => {
      const noteText = item.flagged
        ? `⚠️ ${item.flagged} — check temp & packaging`
        : item.isBundle
          ? `🎯 High-value basket driver — ${fmt2(item.sales / Math.max(item.qty, 1))} each`
          : ''
      return `
          <div class="item-card">
            <p class="item-rank">${idx + 1}</p>
            <div class="item-info">
              <p class="item-name">${item.name}</p>
              ${noteText ? `<p class="item-note">${noteText}</p>` : ''}
            </div>
            <div class="item-sales"><p class="item-sales-val">${fmt2(item.sales)}</p><p class="item-qty">${item.qty} sold</p></div>
          </div>`
    }).join('')
  }

  let html = ''
  if (uberItems.length > 0) {
    html += `<span class="kicker">Top by sales — Uber Eats</span>
        <div style="display:flex;flex-direction:column;gap:10px;${delItems.length > 0 || jeItems.length > 0 ? 'margin-bottom:28px;' : ''}">${renderItems(uberItems)}</div>`
  }
  if (delItems.length > 0) {
    html += `<span class="kicker">Also popular — Deliveroo</span>
        <div style="display:flex;flex-direction:column;gap:10px;${jeItems.length > 0 ? 'margin-bottom:28px;' : ''}">${renderItems(delItems)}</div>`
  }
  if (jeItems.length > 0) {
    html += `<span class="kicker">Just Eat items</span>
        <div style="display:flex;flex-direction:column;gap:10px;">${renderItems(jeItems)}</div>`
  }
  return html
}

function generateSpeed(data: WeeklyReportData): string {
  const { speed, cancellations, inaccurateOrders } = data
  let html = ''

  if (speed.deliveroo) {
    const d = speed.deliveroo
    html += `
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#8e44ad;margin-bottom:12px;">Deliveroo speed</p>
        <div class="speed-block">
          ${d.prepMins > 0 ? `<div class="speed-row"><span class="speed-lbl">Avg prep time</span><div style="display:flex;align-items:center;gap:8px;"><div class="speed-dot ${speedDotClass(d.prepMins, 20, 30)}"></div><span class="speed-val ${speedValClass(d.prepMins, 20, 30)}">${fmtN(d.prepMins)} mins</span></div></div>` : ''}
          ${d.riderWaitMins > 0 || d.riderWaitMins === 0 ? `<div class="speed-row"><span class="speed-lbl">Rider wait past target</span><div style="display:flex;align-items:center;gap:8px;"><div class="speed-dot ${speedDotClass(d.riderWaitMins, 3, 5)}"></div><span class="speed-val ${speedValClass(d.riderWaitMins, 3, 5)}">${fmtN(d.riderWaitMins)} mins</span></div></div>` : ''}
          <div class="speed-row"><span class="speed-lbl">Rider wait &gt;5 mins</span><div style="display:flex;align-items:center;gap:8px;"><div class="speed-dot ${d.riderWaitOver5Pct === 0 ? 'dot-good' : d.riderWaitOver5Pct < 10 ? 'dot-ok' : 'dot-watch'}"></div><span class="speed-val ${d.riderWaitOver5Pct === 0 ? 'speed-val-good' : d.riderWaitOver5Pct >= 10 ? 'speed-val-watch' : ''}">${fmtN(d.riderWaitOver5Pct)}%</span></div></div>
          <div class="speed-row"><span class="speed-lbl">Rider wait &gt;10 mins</span><div style="display:flex;align-items:center;gap:8px;"><div class="speed-dot ${d.riderWaitOver10Pct === 0 ? 'dot-good' : 'dot-watch'}"></div><span class="speed-val ${d.riderWaitOver10Pct === 0 ? 'speed-val-good' : 'speed-val-watch'}">${fmtN(d.riderWaitOver10Pct)}%</span></div></div>
          ${d.orderDurationMins > 0 ? `<div class="speed-row"><span class="speed-lbl">Avg total order duration</span><div style="display:flex;align-items:center;gap:8px;"><div class="speed-dot ${speedDotClass(d.orderDurationMins, 30, 40)}"></div><span class="speed-val ${speedValClass(d.orderDurationMins, 30, 40)}">${fmtN(d.orderDurationMins)} mins</span></div></div>` : ''}
          <div class="speed-row"><span class="speed-lbl">Busy mode usage</span><div style="display:flex;align-items:center;gap:8px;"><div class="speed-dot ${d.busyModePct === 0 ? 'dot-good' : 'dot-watch'}"></div><span class="speed-val ${d.busyModePct === 0 ? 'speed-val-good' : 'speed-val-watch'}">${fmtN(d.busyModePct)}%</span></div></div>
        </div>`
  }

  if (speed.uber) {
    const u = speed.uber
    html += `
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#ff7426;margin-bottom:12px;">Uber Eats speed</p>
        <div class="speed-block">
          ${u.confirmMins > 0 ? `<div class="speed-row"><span class="speed-lbl">Avg time to confirm</span><div style="display:flex;align-items:center;gap:8px;"><div class="speed-dot ${speedDotClass(u.confirmMins, 2, 4)}"></div><span class="speed-val ${speedValClass(u.confirmMins, 2, 4)}">${fmtN(u.confirmMins)} mins</span></div></div>` : ''}
          ${u.prepMins > 0 ? `<div class="speed-row"><span class="speed-lbl">Avg original prep time</span><div style="display:flex;align-items:center;gap:8px;"><div class="speed-dot ${speedDotClass(u.prepMins, 20, 30)}"></div><span class="speed-val ${speedValClass(u.prepMins, 20, 30)}">${fmtN(u.prepMins)} mins</span></div></div>` : ''}
          <div class="speed-row"><span class="speed-lbl">Avg courier wait</span><div style="display:flex;align-items:center;gap:8px;"><div class="speed-dot ${speedDotClass(u.courierWaitMins, 4, 7)}"></div><span class="speed-val ${speedValClass(u.courierWaitMins, 4, 7)}">${fmtN(u.courierWaitMins)} mins</span></div></div>
          <div class="speed-row"><span class="speed-lbl">Avoidable courier wait</span><div style="display:flex;align-items:center;gap:8px;"><div class="speed-dot ${speedDotClass(u.avoidableWaitMins, 2, 4)}"></div><span class="speed-val ${speedValClass(u.avoidableWaitMins, 2, 4)}">${fmtN(u.avoidableWaitMins)} mins</span></div></div>
          <div class="speed-row"><span class="speed-lbl">Avg order duration</span><div style="display:flex;align-items:center;gap:8px;"><div class="speed-dot ${speedDotClass(u.orderDurationMins, 35, 45)}"></div><span class="speed-val ${speedValClass(u.orderDurationMins, 35, 45)}">${fmtN(u.orderDurationMins)} mins</span></div></div>
        </div>`
  }

  // Alerts
  const accuracyAlert = inaccurateOrders.count === 0
    ? `<div class="alert alert-good"><p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#2f7bd8;margin-bottom:8px;">✓ Zero inaccurate orders</p><p style="font-size:14px;font-weight:500;color:#4e5148;line-height:1.55;">No inaccurate orders flagged this week. Clean fulfilment.</p></div>`
    : `<div class="alert alert-warn"><p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8e44ad;margin-bottom:8px;">⚠ ${inaccurateOrders.count} inaccurate order${inaccurateOrders.count !== 1 ? 's' : ''}</p><p style="font-size:14px;font-weight:500;color:#4e5148;line-height:1.55;">Check packing procedures and item accuracy before dispatch.</p></div>`

  const cancelAlert = cancellations.count === 0
    ? `<div class="alert alert-good"><p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#2f7bd8;margin-bottom:8px;">✓ No cancellations</p><p style="font-size:14px;font-weight:500;color:#4e5148;line-height:1.55;">Zero cancellations this week.</p></div>`
    : `<div class="alert alert-warn"><p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8e44ad;margin-bottom:8px;">⚠ ${cancellations.count} cancellation${cancellations.count !== 1 ? 's' : ''}</p><p style="font-size:14px;font-weight:500;color:#4e5148;line-height:1.55;">${cancellations.restaurantFault > 0 ? `${cancellations.restaurantFault} restaurant fault. ` : ''}${cancellations.customerFault > 0 ? `${cancellations.customerFault} customer fault.` : ''} Monitor this pattern going forward.</p></div>`

  html += `<div class="g2">${accuracyAlert}${cancelAlert}</div>`

  if (!speed.uber && !speed.deliveroo) {
    return '<p style="color:#4e5148;">No speed data uploaded for this week.</p>' + html
  }

  return html
}

function generateReviews(data: WeeklyReportData): string {
  const { reviews } = data
  let html = ''

  // Rating tiles
  const tiles: string[] = []
  if (reviews.uber) {
    const u = reviews.uber
    tiles.push(`
          <div style="background:rgba(17,20,13,0.04);border-radius:22px;padding:22px;text-align:center;">
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#6f7169;margin-bottom:12px;">Uber Eats · this week</p>
            <p style="font-size:60px;font-weight:800;line-height:1;color:#11140d;">${u.rating.toFixed(1)}</p>
            <p style="font-size:22px;margin-top:8px;">${stars(u.rating)}</p>
            <p style="font-size:13px;font-weight:600;color:#6f7169;margin-top:8px;">${u.ratingCount} rating${u.ratingCount !== 1 ? 's' : ''} this week</p>
            ${u.weekTheme ? `<p style="font-size:12px;color:#dc2626;font-weight:700;margin-top:4px;">Theme: ${u.weekTheme}</p>` : ''}
          </div>`)
  }
  if (reviews.deliveroo) {
    const d = reviews.deliveroo
    const dailyVals = d.dailyRatings ? Object.values(d.dailyRatings).filter(v => v > 0) : []
    const avgDaily = dailyVals.length > 0
      ? Math.round(dailyVals.reduce((s, v) => s + v, 0) / dailyVals.length * 10) / 10
      : null
    tiles.push(`
          <div style="background:rgba(17,20,13,0.04);border-radius:22px;padding:22px;text-align:center;">
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#6f7169;margin-bottom:12px;">Deliveroo · overall</p>
            <p style="font-size:60px;font-weight:800;line-height:1;color:#11140d;">${d.rating.toFixed(1)}</p>
            <p style="font-size:22px;margin-top:8px;">${stars(d.rating)}</p>
            <p style="font-size:13px;font-weight:600;color:#6f7169;margin-top:8px;">${d.totalCount}+ reviews total</p>
            ${avgDaily != null ? `<p style="font-size:12px;color:#15803d;font-weight:700;margin-top:4px;">Avg ${avgDaily.toFixed(1)}★/day this week</p>` : ''}
          </div>`)
  }

  if (tiles.length > 0) {
    html += `<div class="g2" style="margin-bottom:24px;">${tiles.join('')}</div>`
  }

  // Deliveroo daily ratings (Mon–Sun)
  if (reviews.deliveroo?.dailyRatings && Object.keys(reviews.deliveroo.dailyRatings).length > 0) {
    const dr = reviews.deliveroo.dailyRatings
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const bars = dayOrder.map(day => {
      const rating = dr[day] ?? 0
      if (rating === 0) return `<div class="rbar-row"><span class="rbar-lbl" style="width:36px;">${day}</span><div class="rbar-track"><div class="rbar-fill" style="width:0%;"></div></div><span class="rbar-pct" style="width:44px;">—</span></div>`
      const pct = Math.round((rating / 5) * 100)
      const barColor = rating >= 4.5 ? '#15803d' : rating >= 3.5 ? '#2f7bd8' : rating >= 2.5 ? '#ffc43d' : '#dc2626'
      return `<div class="rbar-row"><span class="rbar-lbl" style="width:36px;">${day}</span><div class="rbar-track"><div class="rbar-fill" style="width:${pct}%;background:${barColor};"></div></div><span class="rbar-pct" style="width:44px;">${rating.toFixed(1)}★</span></div>`
    }).join('')
    html += `<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#6f7169;margin-bottom:12px;">Deliveroo — daily ratings this week</p>
        <div style="background:rgba(17,20,13,0.03);border-radius:18px;padding:16px 20px;margin-bottom:22px;">${bars}</div>`
  }

  // Deliveroo individual reviews (manually entered by admin)
  const delReviews = reviews.deliveroo?.individualReviews
  if (delReviews && delReviews.length > 0) {
    const cards = delReviews.map(r => {
      const starStr = '★'.repeat(r.ratingValue) + '☆'.repeat(Math.max(0, 5 - r.ratingValue))
      const responseHtml = r.response
        ? `<div style="margin-top:10px;padding:10px 14px;background:rgba(47,123,216,0.06);border-radius:12px;">
             <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#2f7bd8;margin-bottom:4px;">Response</p>
             <p style="font-size:13px;color:#4e5148;line-height:1.5;">${r.response.replace(/"/g, '&quot;')}</p>
           </div>`
        : ''
      return `<div class="review-card" style="margin-bottom:12px;">
          <p class="review-stars" style="color:${r.ratingValue <= 2 ? '#dc2626' : r.ratingValue <= 3 ? '#d97706' : '#15803d'};">${starStr}</p>
          ${r.comment ? `<p class="review-txt">"${r.comment.replace(/"/g, '&quot;')}"</p>` : ''}
          ${responseHtml}
        </div>`
    }).join('')
    html += `<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#6f7169;margin-bottom:12px;">Deliveroo — customer reviews</p>
        ${cards}`
  }

  // Uber individual reviews (auto-extracted from CSV — only those with comments or ≤3★)
  const uberReviews = reviews.uber?.individualReviews
  if (uberReviews && uberReviews.length > 0) {
    const tagLabel = (tag: string) =>
      tag.replace(/^restaurant_|^order_|^delivery_/i, '').replace(/_/g, ' ')

    const cards = uberReviews.map(r => {
      const starStr = '★'.repeat(r.ratingValue) + '☆'.repeat(Math.max(0, 5 - r.ratingValue))
      const tagsHtml = r.tags.length
        ? `<p style="margin-top:8px;font-size:11px;color:#6f7169;">${r.tags.map(t => `<span style="background:rgba(17,20,13,0.06);border-radius:8px;padding:2px 8px;margin-right:4px;">${tagLabel(t)}</span>`).join('')}</p>`
        : ''
      const dateHtml = r.date
        ? `<p class="review-meta">${r.date}</p>`
        : ''
      return `<div class="review-card" style="margin-bottom:12px;">
          <p class="review-stars" style="color:${r.ratingValue <= 2 ? '#dc2626' : r.ratingValue <= 3 ? '#d97706' : '#15803d'};">${starStr}</p>
          ${r.comment ? `<p class="review-txt">"${r.comment.replace(/"/g, '&quot;')}"</p>` : ''}
          ${tagsHtml}
          ${dateHtml}
        </div>`
    }).join('')

    html += `<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#6f7169;margin-bottom:12px;">Uber Eats — customer feedback this week</p>
        ${cards}`
  }

  // Admin notes (Deliveroo rating + any manual observations)
  if (reviews.adminNotes) {
    html += `<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#6f7169;margin-bottom:12px;margin-top:${uberReviews?.length ? '20px' : '0'};">Admin notes</p>
        <div class="review-card" style="margin-bottom:20px;">
          <p class="review-txt">${reviews.adminNotes.replace(/\n/g, '<br>')}</p>
        </div>`
  }

  // Flagged items
  if (reviews.flaggedItems.length > 0) {
    const flagText = reviews.flaggedItems.map(f => `<strong style="color:#11140d;">${f.item}</strong> — ${f.issue}`).join(' &nbsp;·&nbsp; ')
    html += `<div class="alert alert-warn"><p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8e44ad;margin-bottom:8px;">Item quality flags</p><p style="font-size:14px;font-weight:500;color:#4e5148;line-height:1.6;">${flagText}</p></div>`
  }

  if (!reviews.uber && !reviews.deliveroo && !reviews.adminNotes) {
    return '<p style="color:#4e5148;">No review data for this week. Add admin notes to include review insights.</p>'
  }

  return html
}

function generateAds(data: WeeklyReportData): string {
  const { ads, conversion, offers } = data
  let html = ''

  if (ads.uber) {
    const u = ads.uber
    html += `<span class="kicker">Uber Eats ads — this week</span>
        <div class="stat-grid">
          <div class="stat-box" style="background:#11140d;color:white;"><p class="stat-val" style="color:#ff7426;font-size:26px;">${fmtN(u.roas)}×</p><p class="stat-lbl" style="color:rgba(255,255,255,0.55);">ROAS</p></div>
          <div class="stat-box"><p class="stat-val">${fmt(u.revenue)}</p><p class="stat-lbl">Ad sales</p></div>
          <div class="stat-box"><p class="stat-val">${fmt(u.spend)}</p><p class="stat-lbl">Ad spend</p></div>
          <div class="stat-box"><p class="stat-val">${u.orders}</p><p class="stat-lbl">Ad orders</p></div>
          ${u.impressions ? `<div class="stat-box"><p class="stat-val">${u.impressions.toLocaleString('en-GB')}</p><p class="stat-lbl">Impressions</p></div>` : ''}
          ${u.clicks ? `<div class="stat-box"><p class="stat-val">${u.clicks.toLocaleString('en-GB')}</p><p class="stat-lbl">Clicks</p></div>` : ''}
          ${u.ctr ? `<div class="stat-box"><p class="stat-val">${fmtN(u.ctr)}%</p><p class="stat-lbl">CTR</p></div>` : ''}
          ${u.costPerOrder ? `<div class="stat-box"><p class="stat-val">${fmt2(u.costPerOrder)}</p><p class="stat-lbl">Cost / order</p></div>` : ''}
        </div>`
  }

  if (ads.deliveroo) {
    const d = ads.deliveroo
    html += `<span class="kicker">Deliveroo ads — this week</span>
        <div style="background:#f5f0df;border-radius:22px;padding:18px 22px;margin-bottom:28px;">
          <div class="metric-row"><span class="metric-lbl">Ad spend</span><span class="metric-val">${fmt2(d.spend)}</span></div>
          <div class="metric-row"><span class="metric-lbl">Click-attributed sales</span><span class="metric-val">${fmt2(d.revenue - (d.viewRevenue ?? 0))}${d.orders ? ` (${d.orders - (d.viewOrders ?? 0)} orders)` : ''}</span></div>
          ${d.viewRevenue ? `<div class="metric-row"><span class="metric-lbl">View-attributed sales</span><span class="metric-val">${fmt2(d.viewRevenue)}${d.viewOrders ? ` (${d.viewOrders} orders)` : ''}</span></div>` : ''}
          ${d.totalViews ? `<div class="metric-row"><span class="metric-lbl">Total views</span><span class="metric-val">${d.totalViews.toLocaleString('en-GB')}</span></div>` : ''}
          ${d.totalClicks ? `<div class="metric-row"><span class="metric-lbl">Total clicks</span><span class="metric-val">${d.totalClicks.toLocaleString('en-GB')}</span></div>` : ''}
        </div>`
  }

  if (ads.justEat) {
    const je = ads.justEat
    html += `<span class="kicker">Just Eat ads — this week</span>
        <div style="background:#f5f0df;border-radius:22px;padding:18px 22px;margin-bottom:28px;">
          <div class="metric-row"><span class="metric-lbl">Ad spend</span><span class="metric-val">${fmt2(je.spend)}</span></div>
          <div class="metric-row"><span class="metric-lbl">Attributed revenue</span><span class="metric-val">${fmt2(je.revenue)} (${je.orders} orders)</span></div>
          <div class="metric-row"><span class="metric-lbl">ROAS</span><span class="metric-val">${fmtN(je.roas)}×</span></div>
        </div>`
  }

  if (conversion && conversion.shopViews) {
    const { shopViews = 0, menuViews = 0, addToCart = 0, ordersPlaced = 0 } = conversion
    const shopToMenu = shopViews > 0 ? fmtN(Math.round((menuViews / shopViews) * 1000) / 10) : '0'
    const menuToOrder = menuViews > 0 ? fmtN(Math.round((ordersPlaced / menuViews) * 1000) / 10) : '0'
    html += `<span class="kicker">Uber Eats conversion funnel — this week</span>
        <div class="funnel-wrap">
          <div class="funnel-step"><p class="funnel-num">${shopViews.toLocaleString('en-GB')}</p><p class="funnel-lbl">Shop views</p></div>
          <p class="funnel-arrow">↓ ${shopToMenu}% shop-to-menu</p>
          <div class="funnel-step"><p class="funnel-num">${menuViews.toLocaleString('en-GB')}</p><p class="funnel-lbl">Menu views</p></div>
          <p class="funnel-arrow">↓ ${menuToOrder}% menu-to-order</p>
          ${addToCart > 0 ? `<div class="funnel-step"><p class="funnel-num">${addToCart.toLocaleString('en-GB')}</p><p class="funnel-lbl">Added to cart</p></div>` : ''}
          <div class="funnel-step" style="background:rgba(47,123,216,0.1);">
            <p class="funnel-num" style="color:#2f7bd8;">${ordersPlaced.toLocaleString('en-GB')}</p>
            <p class="funnel-lbl" style="color:#2f7bd8;font-weight:700;">Orders placed</p>
          </div>
        </div>`
  }

  if (offers?.uber || offers?.deliveroo) {
    const rows: string[] = []
    if (offers.uber) {
      rows.push(`<div class="metric-row"><span class="metric-lbl">Uber — orders with offers</span><span class="metric-val">${offers.uber.ordersWithOffers}</span></div>`)
      rows.push(`<div class="metric-row"><span class="metric-lbl">Uber — total offer value</span><span class="metric-val">${fmt2(offers.uber.offerTotal)}</span></div>`)
    }
    if (offers.deliveroo) {
      rows.push(`<div class="metric-row"><span class="metric-lbl">Deliveroo — orders with offers</span><span class="metric-val">${offers.deliveroo.ordersWithOffers}</span></div>`)
    }
    html += `<span class="kicker">Offers this week</span>
        <div style="background:#f5f0df;border-radius:22px;padding:18px 22px;margin-bottom:28px;">
          ${rows.join('\n          ')}
        </div>`
  }

  if (!ads.uber && !ads.deliveroo && !ads.justEat && !offers?.uber && !offers?.deliveroo) {
    return '<p style="color:#4e5148;">No ad or offer data uploaded for this week.</p>'
  }

  return html
}

export function generateWeeklyReportHtml(data: WeeklyReportData, baseUrl: string = ''): string {
  const { meta, snapshot } = data
  const { brandDef, weekStart, weekEnd } = meta
  const range = dateRange(weekStart, weekEnd)
  const bestDayLabel = dayLabel(snapshot.bestDay)
  const hasJe = data.platforms.some(p => p.platform === 'just_eat')
  const hasItems = data.items.length > 0
  const hasSpeed = !!(data.speed.uber || data.speed.deliveroo)
  const uberReviewCount = data.reviews.uber?.individualReviews?.length ?? 0
  const hasReviews = !!(data.reviews.uber || data.reviews.deliveroo || data.reviews.adminNotes || data.reviews.flaggedItems.length > 0 || uberReviewCount > 0)
  const hasAds = !!(data.ads.uber || data.ads.deliveroo || data.ads.justEat || data.offers?.uber || data.offers?.deliveroo)

  const wowText = snapshot.wowGrossPct != null
    ? `${wowArrow(snapshot.wowGrossPct)} ${fmtPct(snapshot.wowGrossPct)} vs prior wk`
    : 'First recorded week'

  const wowColorVal = wowColor(snapshot.wowGrossPct)
  const heroWowStyle = `font-size:13px;font-weight:800;color:${wowColorVal};margin:4px 0 0;`

  const heroPillLabel = snapshot.wowGrossPct != null && snapshot.wowGrossPct > 10
    ? '↑ Strong demand week'
    : snapshot.wowGrossPct != null && snapshot.wowGrossPct < -10
      ? '↓ Quieter week'
      : '→ Steady week'

  const aovWowText = snapshot.wowAovPct != null
    ? `${snapshot.wowAovPct >= 0 ? '↑' : '↓'} ${fmtPct(snapshot.wowAovPct)} vs prior wk`
    : ''
  const aovWowColor = pctColor(snapshot.wowAovPct)

  const navItems = [
    { id: 'pulse', label: 'Read' },
    { id: 'rhythm', label: 'Rhythm' },
    { id: 'channels', label: 'Channels' },
    ...(hasItems ? [{ id: 'items', label: 'Items' }] : []),
    ...(hasSpeed ? [{ id: 'speed', label: 'Speed' }] : []),
    ...(hasReviews ? [{ id: 'reviews', label: 'Reviews' }] : []),
    ...(hasAds ? [{ id: 'ads', label: 'Ads' }] : []),
    { id: 'focus', label: 'Focus' },
  ]

  const focusItems = generateFocusItems(data)
  const pulseHeadline = generatePulseHeadline(data)

  const logoUrl = logoDataUri(brandDef.logoPath)
  const htLogoUrl = logoDataUri('/Hungry Tum Logo.jpeg')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandDef.displayName} · Week ${range}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #fdfdf9; color: #171717; overflow-x: hidden; }
    .progress { position: fixed; top: 0; left: 0; right: 0; z-index: 50; height: 4px; background: rgba(17,20,13,0.1); }
    .progress-fill { height: 100%; width: 0; border-radius: 0 9999px 9999px 0; background: #ff7426; transition: width 0.1s; }
    .bottom-nav { display: none; position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 40; border-radius: 9999px; border: 1px solid rgba(17,20,13,0.1); background: rgba(255,255,255,0.9); padding: 8px 12px; box-shadow: 0 8px 32px rgba(17,20,13,0.12); backdrop-filter: blur(12px); gap: 4px; }
    @media (min-width: 768px) { .bottom-nav { display: flex; } }
    .bottom-nav a { text-decoration: none; border-radius: 9999px; padding: 8px 16px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #4e5148; transition: all 0.15s; }
    .bottom-nav a:hover { background: #ff7426; color: white; }
    .s-white  { background: #ffffff;  color: #171717; padding: 64px 20px; }
    .s-light  { background: #fdfdf9;  color: #171717; padding: 64px 20px; }
    .s-cream  { background: #f5f0df;  color: #11140d; padding: 64px 20px; }
    .s-dark   { background: #11140d;  color: #fdfdf9; padding: 64px 20px; }
    .s-orange { background: #ff7426;  color: #11140d; padding: 64px 20px; }
    @media (min-width: 640px)  { .s-white,.s-light,.s-cream,.s-dark,.s-orange { padding: 80px 32px; } }
    @media (min-width: 1024px) { .s-white,.s-light,.s-cream,.s-dark,.s-orange { padding: 88px 40px; } }
    .inner { max-width: 1280px; margin: 0 auto; }
    .story { display: grid; gap: 40px; }
    @media (min-width: 1024px) { .story { grid-template-columns: 0.42fr 0.58fr; align-items: center; } }
    @media (min-width: 1024px) { .story-left { position: sticky; top: 40px; } }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #ff7426; }
    .eyebrow-lt { color: #ffabea; }
    .story-h { margin-top: 16px; font-size: clamp(2rem, 4.5vw, 3.25rem); font-weight: 700; line-height: 1.04; max-width: 460px; }
    .story-p { margin-top: 18px; max-width: 400px; font-size: 15px; font-weight: 500; line-height: 1.75; color: #4e5148; }
    .story-p-lt { color: #d9d1b7; }
    .g2 { display: grid; gap: 14px; }
    @media (min-width: 540px) { .g2 { grid-template-columns: 1fr 1fr; } }
    .g3 { display: grid; gap: 14px; }
    @media (min-width: 540px) { .g3 { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 1024px) { .g3 { grid-template-columns: 1fr 1fr 1fr; } }
    .g4 { display: grid; gap: 12px; }
    @media (min-width: 540px) { .g4 { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 1024px) { .g4 { grid-template-columns: repeat(4, 1fr); } }
    .bubble { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 28px; border-radius: 46% 54% 48% 52% / 58% 42% 58% 42%; box-shadow: 0 18px 48px rgba(17,20,13,0.10); }
    .bubble-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.8; }
    .bubble-val { font-size: clamp(2.4rem, 7vw, 4rem); font-weight: 700; line-height: 1; margin-top: 12px; white-space: nowrap; }
    .bubble-hlp { font-size: 13px; font-weight: 600; margin-top: 14px; opacity: 0.8; max-width: 200px; line-height: 1.4; }
    .bub-lg { min-height: 260px; } .bub-md { min-height: 200px; } .bub-sm { min-height: 170px; }
    @media (min-width: 640px) { .bub-lg { min-height: 340px; } .bub-md { min-height: 260px; } .bub-sm { min-height: 210px; } }
    .b-orange { background: #ff7426; color: white; }
    .b-blue   { background: #2f7bd8; color: white; }
    .b-ink    { background: #11140d; color: white; }
    .b-cream  { background: #f5f0df; color: #11140d; }
    .b-pink   { background: #ffabea; color: #11140d; }
    .b-yellow { background: #ffc43d; color: #11140d; }
    .tile { border-radius: 34px; padding: 24px; box-shadow: 0 16px 42px rgba(17,20,13,0.08); }
    .tile-icon { width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
    .tile-h { margin-top: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .tile-p { margin-top: 10px; font-size: 14px; font-weight: 500; line-height: 1.65; }
    .t-orange { background: #ff7426; color: white; } .t-orange .tile-icon { background: rgba(255,255,255,0.18); } .t-orange .tile-p { color: rgba(255,255,255,0.85); }
    .t-blue   { background: #2f7bd8; color: white; } .t-blue   .tile-icon { background: rgba(255,255,255,0.18); } .t-blue   .tile-p { color: rgba(255,255,255,0.85); }
    .t-ink    { background: #11140d; color: white; } .t-ink    .tile-icon { background: rgba(255,255,255,0.18); } .t-ink    .tile-p { color: rgba(255,255,255,0.82); }
    .t-cream  { background: #f5f0df; color: #11140d; } .t-cream .tile-icon { background: rgba(255,255,255,0.7); } .t-cream .tile-p { color: #4e5148; }
    .t-pink   { background: #ffabea; color: #11140d; } .t-pink  .tile-icon { background: rgba(255,255,255,0.7); } .t-pink  .tile-p { color: #4e5148; }
    .t-yellow { background: #ffc43d; color: #11140d; } .t-yellow .tile-icon { background: rgba(255,255,255,0.7); } .t-yellow .tile-p { color: #4e5148; }
    .pill { display: inline-flex; align-items: center; gap: 6px; border-radius: 9999px; padding: 8px 16px; font-size: 13px; font-weight: 700; }
    .pill-up { background: #2f7bd8; color: white; }
    .pill-neu { background: white; color: #11140d; box-shadow: 0 2px 8px rgba(17,20,13,0.08); }
    .hero { position: relative; min-height: 100vh; background: white; padding: 28px 20px; overflow: hidden; }
    @media (min-width: 640px) { .hero { padding: 28px 32px; } }
    .hero-blob1 { position: absolute; top: 96px; right: -112px; width: 288px; height: 288px; border-radius: 9999px; background: rgba(255,171,234,0.7); pointer-events: none; }
    .hero-blob2 { position: absolute; bottom: 80px; left: -128px; width: 320px; height: 320px; border-radius: 9999px; background: rgba(255,116,38,0.85); pointer-events: none; }
    .hero-inner { position: relative; max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; min-height: calc(100vh - 56px); }
    .hero-bar { display: flex; align-items: center; justify-content: space-between; border-top: 2px solid #11140d; border-bottom: 2px solid #11140d; padding: 16px 0; }
    .hero-brand { display: flex; align-items: center; gap: 16px; }
    .ht-logo { width: 44px; height: 44px; border-radius: 9999px; overflow: hidden; flex-shrink: 0; }
    .ht-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .hero-tag-badge { display: inline-flex; border-radius: 9999px; padding: 8px 16px; background: #11140d; color: white; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; }
    .hero-title { margin-top: 20px; font-size: clamp(2.8rem, 8vw, 5.5rem); font-weight: 700; line-height: 0.98; }
    .hero-sub { margin-top: 24px; max-width: 480px; font-size: 17px; font-weight: 500; line-height: 1.7; color: #4e5148; }
    .hero-pills { margin-top: 32px; display: flex; flex-wrap: wrap; gap: 12px; }
    .hero-bubbles { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
    .bubble-col { display: grid; gap: 16px; }
    .hero-content { display: grid; gap: 32px; flex: 1; align-items: center; padding: 40px 0; }
    @media (min-width: 1024px) { .hero-content { grid-template-columns: 0.48fr 0.52fr; } }
    .scroll-down { display: flex; justify-content: center; margin-bottom: 8px; }
    .scroll-btn { width: 48px; height: 48px; border-radius: 9999px; background: #11140d; color: white; display: flex; align-items: center; justify-content: center; text-decoration: none; font-size: 22px; line-height: 1; transition: transform 0.2s; }
    .scroll-btn:hover { transform: translateY(4px); }
    .rhythm-card { background: white; border-radius: 42px; padding: 28px; box-shadow: 0 22px 70px rgba(17,20,13,0.09); }
    .rhythm-row { display: grid; grid-template-columns: 76px minmax(0,1fr); gap: 12px; align-items: center; margin-bottom: 14px; }
    @media (min-width: 600px) { .rhythm-row { grid-template-columns: 84px minmax(0,1fr) 90px; } }
    .rhythm-day { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #4e5148; }
    .rhythm-track { height: 48px; border-radius: 9999px; background: #ece6d4; padding: 4px; }
    .rhythm-bar { height: 100%; border-radius: 9999px; min-width: 48px; display: flex; align-items: center; justify-content: flex-end; padding-right: 14px; font-size: 13px; font-weight: 700; color: white; }
    .rhythm-val { text-align: right; font-size: 13px; font-weight: 700; color: #11140d; display: none; }
    @media (min-width: 600px) { .rhythm-val { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; } }
    .rhythm-footer { margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(17,20,13,0.08); display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .tag { display: inline-block; border-radius: 9999px; padding: 3px 11px; font-size: 11px; font-weight: 700; }
    .tag-green  { background: #2f7bd8; color: white; }
    .tag-warn   { background: #ffabea; color: #11140d; }
    .tag-muted  { background: #ece6d4; color: #4e5148; }
    .tag-orange { background: #ff7426; color: white; }
    .plat-circle { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 180px; border-radius: 44% 56% 47% 53% / 54% 46% 54% 46%; padding: 24px; }
    @media (min-width: 640px) { .plat-circle { min-height: 210px; } }
    .plat-bars { background: rgba(255,255,255,0.06); border-radius: 36px; padding: 20px; margin-top: 28px; }
    .plat-bar-row { margin-bottom: 20px; }
    .plat-bar-meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #f7f4e8; }
    .plat-track { height: 14px; border-radius: 9999px; background: rgba(255,255,255,0.12); }
    .plat-fill { height: 100%; border-radius: 9999px; }
    .item-card { background: white; border-radius: 22px; padding: 16px 18px; box-shadow: 0 8px 28px rgba(17,20,13,0.07); display: flex; align-items: center; gap: 14px; }
    .item-rank { font-size: 28px; font-weight: 900; color: #ece6d4; min-width: 34px; text-align: center; line-height: 1; }
    .item-info { flex: 1; }
    .item-name { font-size: 14px; font-weight: 700; color: #11140d; line-height: 1.3; }
    .item-note { font-size: 12px; font-weight: 500; color: #6f7169; margin-top: 4px; }
    .item-sales { text-align: right; flex-shrink: 0; }
    .item-sales-val { font-size: 16px; font-weight: 800; color: #11140d; }
    .item-qty { font-size: 11px; font-weight: 600; color: #6f7169; margin-top: 3px; }
    .speed-block { background: rgba(17,20,13,0.04); border-radius: 22px; padding: 6px 20px; margin-bottom: 20px; }
    .speed-row { display: flex; align-items: center; justify-content: space-between; padding: 13px 0; border-bottom: 1px solid rgba(17,20,13,0.07); gap: 10px; flex-wrap: wrap; }
    .speed-row:last-child { border-bottom: none; }
    .speed-lbl { font-size: 13px; font-weight: 500; color: #4e5148; flex: 1; min-width: 140px; }
    .speed-val { font-size: 15px; font-weight: 800; color: #11140d; }
    .speed-val-good  { color: #15803d; }
    .speed-val-watch { color: #dc2626; }
    .speed-dot { width: 8px; height: 8px; border-radius: 9999px; flex-shrink: 0; }
    .dot-good  { background: #15803d; }
    .dot-watch { background: #dc2626; }
    .dot-ok    { background: rgba(17,20,13,0.18); }
    .alert { border-radius: 20px; padding: 18px 20px; border: 2px solid; }
    .alert-good { background: rgba(47,123,216,0.1); border-color: rgba(47,123,216,0.25); }
    .alert-warn { background: rgba(255,171,234,0.12); border-color: rgba(255,171,234,0.3); }
    .review-card { background: rgba(17,20,13,0.04); border: 1px solid rgba(17,20,13,0.08); border-radius: 22px; padding: 20px; }
    .review-stars { font-size: 17px; letter-spacing: 2px; margin-bottom: 10px; }
    .review-txt { font-size: 14px; font-weight: 500; line-height: 1.6; color: #11140d; font-style: italic; }
    .review-meta { margin-top: 10px; font-size: 11px; font-weight: 600; color: #6f7169; text-transform: uppercase; letter-spacing: 0.1em; }
    .rbar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .rbar-row:last-child { margin-bottom: 0; }
    .rbar-lbl { font-size: 12px; font-weight: 700; color: #4e5148; width: 28px; text-align: right; }
    .rbar-track { flex: 1; height: 9px; border-radius: 9999px; background: rgba(17,20,13,0.1); }
    .rbar-fill { height: 100%; border-radius: 9999px; }
    .rbar-pct { font-size: 12px; font-weight: 700; color: #4e5148; width: 32px; }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 28px; }
    @media (min-width: 540px) { .stat-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 900px) { .stat-grid { grid-template-columns: repeat(4, 1fr); } }
    .stat-box { background: #f5f0df; border-radius: 18px; padding: 16px; text-align: center; }
    .stat-val { font-size: 22px; font-weight: 800; color: #11140d; line-height: 1; }
    .stat-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6f7169; margin-top: 6px; }
    .metric-row { display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid #ece6d4; gap: 8px; }
    .metric-row:last-child { border-bottom: none; }
    .metric-lbl { font-size: 13px; font-weight: 500; color: #4e5148; }
    .metric-val { font-size: 15px; font-weight: 800; color: #11140d; }
    .funnel-wrap { background: #f5f0df; border-radius: 24px; padding: 20px; }
    .funnel-step { display: flex; align-items: center; gap: 14px; background: rgba(17,20,13,0.04); border-radius: 14px; padding: 14px 16px; margin-bottom: 6px; }
    .funnel-num { font-size: 22px; font-weight: 800; color: #ff7426; min-width: 72px; text-align: right; }
    .funnel-lbl { font-size: 13px; font-weight: 600; color: #4e5148; }
    .funnel-arrow { text-align: center; font-size: 13px; font-weight: 600; color: #6f7169; margin: 4px 14px; }
    .focus-item { display: flex; align-items: flex-start; gap: 16px; padding: 20px 0; border-bottom: 2px solid rgba(255,255,255,0.08); }
    .focus-item:last-child { border-bottom: none; }
    .focus-num { font-size: 40px; font-weight: 900; color: rgba(255,255,255,0.15); line-height: 1; min-width: 44px; }
    .focus-body { flex: 1; }
    .focus-action { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.55); margin-bottom: 6px; }
    .focus-desc { font-size: 15px; font-weight: 500; color: rgba(255,255,255,0.88); line-height: 1.65; }
    .kicker { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; color: #6f7169; margin-bottom: 14px; display: block; }
    footer { background: #fdfdf9; padding: 32px 20px; }
    .footer-inner { max-width: 1280px; margin: 0 auto; border-top: 2px solid #11140d; padding-top: 20px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; }
    .footer-txt { font-size: 13px; font-weight: 700; color: #6f7169; }
  </style>
</head>
<body>

<div class="progress"><div class="progress-fill" id="progressBar"></div></div>

<nav class="bottom-nav">
  ${navItems.map(n => `<a href="#${n.id}">${n.label}</a>`).join('\n  ')}
</nav>

<!-- HERO -->
<section class="hero" id="top">
  <div class="hero-blob1"></div>
  <div class="hero-blob2"></div>
  <div class="hero-inner">
    <header class="hero-bar">
      <div class="hero-brand">
        <div class="ht-logo"><img src="${htLogoUrl}" alt="Hungry Tum"></div>
        <div>
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;">Hungry Tum weekly</p>
          <p style="font-size:11px;font-weight:500;color:#6f7169;margin-top:4px;">${range}</p>
        </div>
      </div>
      <img src="${logoUrl}" alt="${brandDef.displayName}" style="height:56px;width:auto;max-width:140px;object-fit:contain;display:block;flex-shrink:0;">
    </header>
    <div class="hero-content">
      <div>
        <span class="hero-tag-badge">Weekly site update</span>
        <h1 class="hero-title">${brandDef.displayName} weekly update.</h1>
        <p class="hero-sub">Here is what happened at the site this week: how busy it was, where demand came from, and what to watch next.</p>
        <div class="hero-pills">
          <div class="pill pill-up">${heroPillLabel}</div>
          <div class="pill pill-neu">📅 ${range}</div>
        </div>
      </div>
      <div class="hero-bubbles">
        <div class="bubble b-orange bub-lg" style="transform:rotate(-3deg);">
          <p class="bubble-lbl">Gross sales</p>
          <p class="bubble-val">${fmt(snapshot.grossSales)}</p>
          <p style="${heroWowStyle}">${wowText}</p>
          <p class="bubble-hlp">${snapshot.orders} orders · ${data.platforms.map(p => platformLabel(p.platform)).join(' + ')}</p>
        </div>
        <div class="bubble-col">
          <div class="bubble b-cream bub-sm" style="transform:rotate(2deg);">
            <p class="bubble-lbl" style="color:#4e5148;">AOV</p>
            <p class="bubble-val" style="font-size:clamp(1.8rem,5vw,2.8rem);">${fmt2(snapshot.aov)}</p>
            ${snapshot.wowAovPct != null ? `<p style="font-size:12px;font-weight:800;color:${aovWowColor};margin:3px 0 0;">${aovWowText}</p>` : ''}
            <p class="bubble-hlp" style="color:#4e5148;">Average basket</p>
          </div>
          <div class="bubble b-blue bub-sm" style="transform:rotate(-1deg);">
            <p class="bubble-lbl">Best day</p>
            <p class="bubble-val" style="font-size:clamp(1.8rem,5vw,2.6rem);">${fmt(snapshot.bestDayAmount)}</p>
            <p class="bubble-hlp">${bestDayLabel}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="scroll-down"><a href="#pulse" class="scroll-btn">↓</a></div>
  </div>
</section>

<!-- 01 OPERATOR READ -->
<section id="pulse" class="s-white">
  <div class="inner">
    <div class="story">
      <div class="story-left">
        <p class="eyebrow">01 — operator read</p>
        <h2 class="story-h">${pulseHeadline}</h2>
      </div>
      <div class="g2">
        ${generatePulseTiles(data)}
      </div>
    </div>
  </div>
</section>

<!-- 02 DAILY RHYTHM -->
<section id="rhythm" class="s-cream">
  <div class="inner">
    <div class="story">
      <div class="story-left">
        <p class="eyebrow">02 — daily rhythm</p>
        <h2 class="story-h">Where the week had its shape.</h2>
        <p class="story-p">Both platforms per day. The best combined day was ${bestDayLabel} at ${fmt(snapshot.bestDayAmount)}.</p>
      </div>
      <div>
        ${generateDailyRhythm(data)}
      </div>
    </div>
  </div>
</section>

<!-- 03 CHANNEL MIX -->
<section id="channels" class="s-dark">
  <div class="inner">
    <div class="story">
      <div class="story-left">
        <p class="eyebrow eyebrow-lt">03 — channel mix</p>
        <h2 class="story-h">Where the orders came from.</h2>
        <p class="story-p story-p-lt">${data.platforms.length > 1 ? `${platformLabel([...data.platforms].sort((a, b) => b.sales - a.sales)[0].platform)} drove the largest share of sales this week. ${data.platforms.length} platforms active.` : `All orders came through ${data.platforms[0] ? platformLabel(data.platforms[0].platform) : 'one platform'} this week.`}</p>
      </div>
      <div>
        ${generateChannelMix(data)}
      </div>
    </div>
  </div>
</section>

${hasItems ? `<!-- 04 ITEM WINNERS -->
<section id="items" class="s-light">
  <div class="inner">
    <div class="story">
      <div class="story-left">
        <p class="eyebrow">04 — item winners</p>
        <h2 class="story-h">What customers actually bought.</h2>
        <p class="story-p">Keep these prepped and consistent. They are driving revenue and orders across platforms.</p>
      </div>
      <div>
        ${generateItemWinners(data)}
      </div>
    </div>
  </div>
</section>` : ''}

${hasSpeed ? `<!-- 05 SPEED & READINESS -->
<section id="speed" class="s-cream">
  <div class="inner">
    <div class="story">
      <div class="story-left">
        <p class="eyebrow">05 — speed &amp; readiness</p>
        <h2 class="story-h">Was the kitchen ready for demand?</h2>
        <p class="story-p">${data.speed.deliveroo && data.speed.uber ? 'Both platforms tracked this week. Deliveroo speed and Uber dispatch are compared below.' : data.speed.uber ? 'Uber Eats speed metrics from this week.' : 'Deliveroo speed metrics from this week.'}</p>
      </div>
      <div>
        ${generateSpeed(data)}
      </div>
    </div>
  </div>
</section>` : ''}

${hasReviews ? `<!-- 06 REVIEWS -->
<section id="reviews" class="s-white">
  <div class="inner">
    <div class="story">
      <div class="story-left">
        <p class="eyebrow">06 — reviews &amp; quality</p>
        <h2 class="story-h">What customers said.</h2>
        <p class="story-p">Ratings and quality signals from this week. Hot food delivered fast = 5 stars.</p>
      </div>
      <div>
        ${generateReviews(data)}
      </div>
    </div>
  </div>
</section>` : ''}

${hasAds ? `<!-- 07 ADS & OFFERS -->
<section id="ads" class="s-light">
  <div class="inner">
    <div class="story">
      <div class="story-left">
        <p class="eyebrow">07 — ads, offers &amp; conversion</p>
        <h2 class="story-h">What created the demand.</h2>
        <p class="story-p">${data.ads.uber ? `Uber ROAS of ${fmtN(data.ads.uber.roas)}× means every £1 in ad spend returned £${fmtN(data.ads.uber.roas)} in attributed sales.` : 'Ad performance and conversion data for this week.'}</p>
      </div>
      <div>
        ${generateAds(data)}
      </div>
    </div>
  </div>
</section>` : ''}

<!-- 08 NEXT WEEK FOCUS -->
<section id="focus" class="s-dark" style="background: linear-gradient(150deg, #5b1d75 0%, #8e44ad 45%, #9b59b6 100%);">
  <div class="inner">
    <div style="max-width:560px;margin-bottom:48px;">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:rgba(255,255,255,0.45);">0${hasItems ? (hasSpeed ? (hasReviews ? (hasAds ? '8' : '7') : (hasAds ? '7' : '6')) : (hasReviews ? '7' : '6')) : '5'} — next week focus</p>
      <h2 style="margin-top:16px;font-size:clamp(2.2rem,5vw,3.5rem);font-weight:700;line-height:1.02;">What the kitchen takes into next week.</h2>
    </div>
    <div>
      ${focusItems.map((item, i) => `
      <div class="focus-item">
        <p class="focus-num">0${i + 1}</p>
        <div class="focus-body">
          <p class="focus-action">${item.action}</p>
          <p class="focus-desc">${item.desc}</p>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<footer>
  <div class="footer-inner">
    <span style="font-size:18px;">✨</span>
    <p class="footer-txt">Hungry Tum weekly partner report · ${brandDef.displayName} · ${range}</p>
  </div>
</footer>

<script>
  window.addEventListener('scroll', function() {
    var scrolled = window.scrollY;
    var total = document.documentElement.scrollHeight - window.innerHeight;
    var pct = total > 0 ? (scrolled / total) * 100 : 0;
    document.getElementById('progressBar').style.width = pct + '%';
  });
</script>
</body>
</html>`
}
