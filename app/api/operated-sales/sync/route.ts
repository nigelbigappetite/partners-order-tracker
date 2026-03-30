import { NextResponse } from 'next/server'
import {
  getOperatedSiteSalesSyncStatus,
  getOperatedSiteSheetConfigs,
  previewOperatedSiteSalesSync,
  readOperatedSiteSalesFromGoogleSheet,
  upsertOperatedSiteSales,
} from '@/lib/operated-site-sales'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [preview, status] = await Promise.all([
      previewOperatedSiteSalesSync(),
      getOperatedSiteSalesSyncStatus(),
    ])

    return NextResponse.json({
      success: true,
      preview,
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

export async function POST() {
  try {
    const rows = await readOperatedSiteSalesFromGoogleSheet()
    const result = await upsertOperatedSiteSales(rows)
    const status = await getOperatedSiteSalesSyncStatus()

    return NextResponse.json({
      success: true,
      ...result,
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
