'use client'

import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import { Building2, Check, ChevronDown, ChevronUp, Copy, Eye, EyeOff, Link2, Mail, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface KitchenSite {
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

const LOGO_OPTIONS = [
  { label: 'Wing Shack', value: '/transparent Wing Shack logo 1080x1080.png' },
  { label: 'SMSH BN', value: '/smsh bn logo rnd.png' },
  { label: 'Eggs n Stuff', value: '/Eggs n Stuff logo.png' },
  { label: 'Hungry Tum', value: '/Hungry Tum Logo.jpeg' },
]

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function appUrl(): string {
  return typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://partners-order-tracker.vercel.app')
}

function loginUrl(slug: string): string {
  return `${appUrl()}/kitchens/login?kitchen=${slug}`
}

function copyText(text: string, label = 'Copied!') {
  navigator.clipboard.writeText(text).then(() => toast.success(label))
}

// ─── New Site Form ────────────────────────────────────────────────────────────

interface NewSiteFormProps {
  onCreated: (site: KitchenSite) => void
  onCancel: () => void
}

function NewSiteForm({ onCreated, onCancel }: NewSiteFormProps) {
  const [displayName, setDisplayName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [logoPath, setLogoPath] = useState(LOGO_OPTIONS[0].value)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dataBrandSlug, setDataBrandSlug] = useState('wing-shack-co')
  const [locationFilter, setLocationFilter] = useState('')
  const [deliverooKey, setDeliverooKey] = useState('')
  const [kitchenLocation, setKitchenLocation] = useState('')
  const [saving, setSaving] = useState(false)

  function onNameChange(v: string) {
    setDisplayName(v)
    if (!slugManual) setSlug(slugify(v))
    // Auto-fill advanced fields from name
    if (!locationFilter) {
      const parts = v.split(' ')
      setLocationFilter(parts[parts.length - 1] || '')
    }
    if (!deliverooKey) {
      const parts = v.split(' ')
      setDeliverooKey((parts[parts.length - 1] || '').toLowerCase())
    }
    if (!kitchenLocation) {
      setKitchenLocation(`Wing Shack Co- ${v.split(' ').pop() || ''}`)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName || !slug || !password) {
      toast.error('Name, slug and password are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          display_name: displayName,
          password,
          franchisee_email: email || null,
          logo_path: logoPath,
          data_brand_slug: dataBrandSlug || null,
          location_filter: locationFilter || null,
          deliveroo_location_key: deliverooKey || null,
          kitchen_location: kitchenLocation || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create site')
      toast.success(`${displayName} created`)
      onCreated(data.site)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create site')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-orange-200 bg-orange-50 p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">New site</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Site name *</label>
          <input
            type="text"
            value={displayName}
            onChange={e => onNameChange(e.target.value)}
            placeholder="Wing Shack Reading"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Slug * (URL-safe, no spaces)</label>
          <input
            type="text"
            value={slug}
            onChange={e => { setSlugManual(true); setSlug(slugify(e.target.value)) }}
            placeholder="wing-shack-reading"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-orange-400 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Password *</label>
          <input
            type="text"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="reading123"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Franchisee email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="operator@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Logo</label>
          <select
            value={logoPath}
            onChange={e => setLogoPath(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
          >
            {LOGO_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="mt-4 flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Advanced (data connections)
      </button>

      {showAdvanced && (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Deliveroo location key</label>
            <input
              type="text"
              value={deliverooKey}
              onChange={e => setDeliverooKey(e.target.value)}
              placeholder="reading"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-orange-400 focus:outline-none"
            />
            <p className="mt-0.5 text-xs text-gray-400">Used when connecting Deliveroo live data</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Uber kitchen name (for file filtering)</label>
            <input
              type="text"
              value={kitchenLocation}
              onChange={e => setKitchenLocation(e.target.value)}
              placeholder="Wing Shack Co- Reading"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
            />
            <p className="mt-0.5 text-xs text-gray-400">Exact name as it appears in Uber Eats exports</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Location filter (kitchen_sales)</label>
            <input
              type="text"
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              placeholder="Reading"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Data brand slug</label>
            <input
              type="text"
              value={dataBrandSlug}
              onChange={e => setDataBrandSlug(e.target.value)}
              placeholder="wing-shack-co"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-orange-400 focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create site'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Site Row ─────────────────────────────────────────────────────────────────

interface SiteRowProps {
  site: KitchenSite
  onUpdated: (slug: string, data: Partial<KitchenSite>) => void
  onDeleted: (slug: string) => void
}

function SiteRow({ site, onUpdated, onDeleted }: SiteRowProps) {
  const [editing, setEditing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resettingPw, setResettingPw] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [editName, setEditName] = useState(site.display_name)
  const [editEmail, setEditEmail] = useState(site.franchisee_email ?? '')
  const [editDeliverooKey, setEditDeliverooKey] = useState(site.deliveroo_location_key ?? '')
  const [editKitchenLocation, setEditKitchenLocation] = useState(site.kitchen_location ?? '')
  const [editLocationFilter, setEditLocationFilter] = useState(site.location_filter ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function patch(data: Partial<KitchenSite>) {
    const res = await fetch(`/api/admin/sites/${site.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error || 'Update failed')
    }
  }

  async function handleSaveEdit() {
    setSaving(true)
    try {
      const update = {
        display_name: editName,
        franchisee_email: editEmail || null,
        deliveroo_location_key: editDeliverooKey || null,
        kitchen_location: editKitchenLocation || null,
        location_filter: editLocationFilter || null,
      }
      await patch(update)
      onUpdated(site.slug, update)
      setEditing(false)
      toast.success('Site updated')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!newPassword.trim()) { toast.error('Enter a new password'); return }
    setSaving(true)
    try {
      await patch({ password: newPassword.trim() })
      onUpdated(site.slug, { password: newPassword.trim() })
      setResettingPw(false)
      setNewPassword('')
      toast.success('Password updated')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/sites/${site.slug}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      onDeleted(site.slug)
      toast.success(`${site.display_name} removed`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
      setConfirmDelete(false)
    }
  }

  const url = loginUrl(site.slug)
  const credentials = `${site.display_name} login\nURL: ${url}\nPassword: ${site.password ?? '(not set)'}`

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100">
            <Building2 className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            {editing ? (
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-sm font-semibold focus:border-orange-400 focus:outline-none"
              />
            ) : (
              <p className="font-semibold text-gray-900">{site.display_name}</p>
            )}
            <p className="font-mono text-xs text-gray-400">{site.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-200"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-600 font-medium">Sure?</span>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="rounded-md bg-red-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">No</button>
            </div>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Email */}
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">Franchisee email</p>
          {editing ? (
            <input
              type="email"
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              placeholder="operator@example.com"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-400 focus:outline-none"
            />
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-800">{site.franchisee_email || <span className="text-gray-400 italic">Not set</span>}</p>
              {site.franchisee_email && (
                <button
                  onClick={() => copyText(site.franchisee_email!, 'Email copied')}
                  className="text-gray-400 hover:text-gray-600"
                  title="Copy email"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Password */}
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">Password</p>
          {resettingPw ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password"
                className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-400 focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleResetPassword}
                disabled={saving}
                className="rounded-md bg-orange-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? '…' : <Check className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => { setResettingPw(false); setNewPassword('') }} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm text-gray-800">
                {showPassword ? (site.password ?? '—') : '••••••••'}
              </p>
              <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600" title={showPassword ? 'Hide' : 'Show'}>
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              {site.password && (
                <button onClick={() => copyText(site.password!, 'Password copied')} className="text-gray-400 hover:text-gray-600" title="Copy password">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setResettingPw(true)}
                className="text-xs font-medium text-orange-500 hover:text-orange-600"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Advanced fields in edit mode */}
        {editing && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Deliveroo location key</label>
              <input
                type="text"
                value={editDeliverooKey}
                onChange={e => setEditDeliverooKey(e.target.value)}
                placeholder="reading"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono focus:border-orange-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Uber kitchen name</label>
              <input
                type="text"
                value={editKitchenLocation}
                onChange={e => setEditKitchenLocation(e.target.value)}
                placeholder="Wing Shack Co- Reading"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Location filter</label>
              <input
                type="text"
                value={editLocationFilter}
                onChange={e => setEditLocationFilter(e.target.value)}
                placeholder="Reading"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-400 focus:outline-none"
              />
            </div>
          </>
        )}
      </div>

      {/* Login link */}
      <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
        <p className="mb-2 text-xs font-medium text-gray-500">Operator login link</p>
        <p className="mb-2 break-all font-mono text-xs text-gray-700">{url}</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => copyText(url, 'Login link copied!')}
            className="inline-flex items-center gap-1.5 rounded-md bg-white border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Link2 className="h-3.5 w-3.5" />
            Copy link
          </button>
          <button
            onClick={() => copyText(credentials, 'Login details copied!')}
            className="inline-flex items-center gap-1.5 rounded-md bg-white border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy link + password
          </button>
          {site.franchisee_email && (
            <a
              href={`mailto:${site.franchisee_email}?subject=${encodeURIComponent(`Your ${site.display_name} operator login`)}&body=${encodeURIComponent(`Hi,\n\nHere are your login details for the ${site.display_name} partner portal:\n\nURL: ${url}\nPassword: ${site.password ?? '(contact us for password)'}\n\nSave this link as a bookmark for easy access.\n\nHungry Tum team`)}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
            >
              <Mail className="h-3.5 w-3.5" />
              Email to operator
            </a>
          )}
        </div>
      </div>

      {/* Save / cancel when editing */}
      {editing && (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSaveEdit}
            disabled={saving}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            onClick={() => {
              setEditing(false)
              setEditName(site.display_name)
              setEditEmail(site.franchisee_email ?? '')
              setEditDeliverooKey(site.deliveroo_location_key ?? '')
              setEditKitchenLocation(site.kitchen_location ?? '')
              setEditLocationFilter(site.location_filter ?? '')
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSitesPage() {
  const [sites, setSites] = useState<KitchenSite[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)

  async function loadSites() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sites')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load sites')
      setSites(data.sites ?? [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load sites')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSites() }, [])

  function handleCreated(site: KitchenSite) {
    setSites(prev => [...prev, site].sort((a, b) => a.display_name.localeCompare(b.display_name)))
    setShowNewForm(false)
  }

  function handleUpdated(slug: string, data: Partial<KitchenSite>) {
    setSites(prev => prev.map(s => s.slug === slug ? { ...s, ...data } : s))
  }

  function handleDeleted(slug: string) {
    setSites(prev => prev.filter(s => s.slug !== slug))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
            <p className="mt-1 text-sm text-gray-500">Kitchen operator accounts — manage access, passwords and login links</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadSites}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              New site
            </button>
          </div>
        </div>

        {showNewForm && (
          <div className="mb-6">
            <NewSiteForm onCreated={handleCreated} onCancel={() => setShowNewForm(false)} />
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">Loading sites…</div>
        ) : sites.length === 0 && !showNewForm ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No sites yet.</p>
            <button
              onClick={() => setShowNewForm(true)}
              className="mt-3 text-sm font-medium text-orange-500 hover:text-orange-600"
            >
              Create your first site →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sites.map(site => (
              <SiteRow
                key={site.slug}
                site={site}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
