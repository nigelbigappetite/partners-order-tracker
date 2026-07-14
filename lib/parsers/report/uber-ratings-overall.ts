import { UberRatingsOverallResult, UberReviewItem } from './types'
import { parseCSV, parseNum, findCol, buildSiteFilter } from './csv-utils'

/**
 * Parses Uber Eats "restaurant_rating_local" CSV.
 *
 * Two formats exist:
 *   Per-review (common): one row per customer review.
 *     Detected by presence of 'Rating value' column.
 *     Columns: Restaurant, Order ID, Date ordered, Rating date, Rating type,
 *              Rating value (1–5), Rating tags, Comment, …
 *     → average all Rating value entries for the site; count = number of reviews.
 *
 *   Summary (rare): one row per restaurant.
 *     Columns: Restaurant, Period, Rating (avg), Rating count.
 *     → read Rating column + Rating count column directly.
 */
export function parseUberRatingsOverall(csvText: string, siteNameFilter: string): UberRatingsOverallResult {
  const { headers, rows } = parseCSV(csvText)

  const restaurantIdx = findCol(headers, 'restaurant', 'shop name', 'store name')

  // Per-review format: 'Rating value' column contains individual star ratings (1–5)
  const ratingValueIdx = findCol(headers, 'rating value')

  // Summary format: aggregate rating + count columns (checked by exact match only — do NOT
  // use partial 'rating' match as it would hit 'Rating date', 'Rating type', etc.)
  const ratingAvgIdx = ratingValueIdx >= 0 ? -1 : (() => {
    // Exact-only search: try each candidate, no partial fallback
    const candidates = ['overall rating', 'avg rating', 'average rating', 'star rating', 'rating']
    for (const c of candidates) {
      const idx = headers.indexOf(c)
      if (idx >= 0) return idx
    }
    return -1
  })()

  const countIdx = ratingValueIdx >= 0 ? -1 :
    findCol(headers, 'rating count', 'number of ratings', 'ratings count', 'total ratings', 'review count')

  const isPerReview = ratingValueIdx >= 0
  const ratingIdx = isPerReview ? ratingValueIdx : ratingAvgIdx

  // Extra columns for per-review format
  const commentIdx = isPerReview ? findCol(headers, 'comment', 'review text', 'feedback') : -1
  const tagsIdx = isPerReview ? findCol(headers, 'rating tags', 'tags') : -1
  const dateIdx = isPerReview ? findCol(headers, 'rating date', 'date ordered', 'date') : -1

  const matchRow = buildSiteFilter(siteNameFilter, restaurantIdx, rows)
  const ratingValues: number[] = []
  const individualReviews: UberReviewItem[] = []
  let countFromColumn = 0

  for (const row of rows) {
    if (!matchRow(row)) continue

    if (ratingIdx >= 0) {
      const r = parseNum(row[ratingIdx])
      if (r > 0) {
        ratingValues.push(r)

        if (isPerReview) {
          const comment = commentIdx >= 0 ? row[commentIdx]?.trim() || '' : ''
          const rawTags = tagsIdx >= 0 ? row[tagsIdx]?.trim() || '' : ''
          const tags = rawTags
            ? rawTags.split(',').map(t => t.trim().replace(/^"|"$/g, '')).filter(Boolean)
            : []
          const date = dateIdx >= 0 ? row[dateIdx]?.trim().split(' ')[0] || '' : ''

          // Only keep reviews that have a comment or are low-rated (useful signal)
          if (comment || r <= 3) {
            individualReviews.push({ ratingValue: r, comment, tags, date })
          }
        }
      }
    }

    if (!isPerReview && countIdx >= 0) {
      countFromColumn += parseNum(row[countIdx])
    }
  }

  const rating = ratingValues.length > 0
    ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
    : 0

  const ratingCount = isPerReview ? ratingValues.length : countFromColumn

  // Sort: lowest rated first, then by date
  individualReviews.sort((a, b) => a.ratingValue - b.ratingValue || a.date.localeCompare(b.date))

  return { rating: Math.round(rating * 100) / 100, ratingCount, individualReviews }
}
