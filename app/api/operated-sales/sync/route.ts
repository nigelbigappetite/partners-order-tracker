import { NextResponse } from 'next/server'
import {
  getOperatedSiteSalesSyncStatus,
  getOperatedSiteSheetConfigs,
  previewOperatedSiteSalesSync,
  readOperatedSiteSalesFromGoogleSheet,
  upsertOperatedSiteSales,
} from '@/lib/operated-site-sales'

export const dynamic = 'force-dynamic'

function getDateRangeFromSearchParams(request: Request) {
  const { searchParams } = new URL(request.url)
  return {
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
  }
}

export async function GET(request: Request) {
  try {
    const range = getDateRangeFromSearchParams(request)
    const [preview, status] = await Promise.all([
      previewOperatedSiteSalesSync(range),
      getOperatedSiteSalesSyncStatus(),
    ])

    return NextResponse.json({
      success: true,
      preview,
      range,
      status,
      sheets: getOperatedSiteSheetConfigs().map((config) => ({
        sheetName: config.sheetName,
        siteSlug: config.siteSlug,
        brandSlug: config.brandSlug,
      })),
    })
  } catch (error: any) {
    console.error('[operated-sales preview] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to preview operated site sales sync' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const range = {
      startDate: body?.startDate || undefined,
      endDate: body?.endDate || undefined,
    }
    const rows = await readOperatedSiteSalesFromGoogleSheet(range)
    const result = await upsertOperatedSiteSales(rows)
    const status = await getOperatedSiteSalesSyncStatus()

    return NextResponse.json({
      success: true,
      ...result,
      range,
      status,
      sheets: getOperatedSiteSheetConfigs().map((config) => ({
        sheetName: config.sheetName,
        siteSlug: config.siteSlug,
        brandSlug: config.brandSlug,
      })),
    })
  } catch (error: any) {
    console.error('[operated-sales sync] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to sync operated site sales' },
      { status: 500 }
    )
  }
}
