import type { BrandDefinition } from './brands'

export interface KitchenSiteRecord {
  id: string
  slug: string
  display_name: string
  logo_path: string
  data_brand_slug: string | null
  location_filter: string | null
  deliveroo_location_key: string | null
  kitchen_location: string | null
  ordering_site_id: string | null
  data_start_date: string | null
  password: string | null
  franchisee_email: string | null
  active: boolean
  created_at: string
}

const PARTNERS_URL = process.env.HT_PARTNERS_SUPABASE_URL!
const PARTNERS_KEY = process.env.HT_PARTNERS_SERVICE_ROLE_KEY!

function dbHeaders(extra?: Record<string, string>) {
  return {
    apikey: PARTNERS_KEY,
    Authorization: `Bearer ${PARTNERS_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  }
}

export async function getKitchenSitesFromDb(): Promise<KitchenSiteRecord[]> {
  const res = await fetch(
    `${PARTNERS_URL}/rest/v1/kitchen_sites?active=eq.true&order=display_name.asc`,
    { headers: dbHeaders(), cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`DB error: ${await res.text()}`)
  return res.json()
}

export async function getKitchenSiteBySlug(slug: string): Promise<KitchenSiteRecord | null> {
  const res = await fetch(
    `${PARTNERS_URL}/rest/v1/kitchen_sites?slug=eq.${encodeURIComponent(slug)}&limit=1`,
    { headers: dbHeaders(), cache: 'no-store' }
  )
  if (!res.ok) return null
  const rows: KitchenSiteRecord[] = await res.json()
  return rows[0] ?? null
}

export async function createKitchenSite(
  data: Omit<KitchenSiteRecord, 'id' | 'created_at' | 'active'>
): Promise<KitchenSiteRecord> {
  const res = await fetch(`${PARTNERS_URL}/rest/v1/kitchen_sites`, {
    method: 'POST',
    headers: dbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify({ ...data, active: true }),
  })
  if (!res.ok) throw new Error(`DB error: ${await res.text()}`)
  const rows: KitchenSiteRecord[] = await res.json()
  return rows[0]
}

export async function updateKitchenSite(
  slug: string,
  data: Partial<Omit<KitchenSiteRecord, 'id' | 'slug' | 'created_at'>>
): Promise<void> {
  const res = await fetch(
    `${PARTNERS_URL}/rest/v1/kitchen_sites?slug=eq.${encodeURIComponent(slug)}`,
    {
      method: 'PATCH',
      headers: dbHeaders(),
      body: JSON.stringify(data),
    }
  )
  if (!res.ok) throw new Error(`DB error: ${await res.text()}`)
}

export async function deactivateKitchenSite(slug: string): Promise<void> {
  await updateKitchenSite(slug, { active: false })
}

/** Convert a KitchenSiteRecord to a BrandDefinition-compatible object */
export function siteRecordToBrandDef(site: KitchenSiteRecord): BrandDefinition {
  return {
    canonicalSlug: site.slug,
    displayName: site.display_name,
    logoPath: site.logo_path || '/transparent Wing Shack logo 1080x1080.png',
    aliases: [],
    dataBrandSlug: site.data_brand_slug ?? undefined,
    locationFilter: site.location_filter ?? undefined,
    dataStartDate: site.data_start_date ?? undefined,
    orderingSiteId: site.ordering_site_id ?? undefined,
    deliverooLocationKey: site.deliveroo_location_key ?? undefined,
    kitchenLocation: site.kitchen_location ?? undefined,
  }
}
