'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, Package, Store, MapPin, FileText, Menu, X } from 'lucide-react'
import { getBrandLogo, getBrandLogoAlt } from '@/lib/brandLogos'

interface BrandNavigationProps {
  brandSlug: string
  brandName: string
}

export default function BrandNavigation({ brandSlug, brandName }: BrandNavigationProps) {
  const pathname = usePathname()
  const [logoError, setLogoError] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Define which pages each brand can access
  const getNavItems = () => {
    const baseItems = [
      { href: `/brands/${brandSlug}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
      { href: `/brands/${brandSlug}/products`, label: 'Products', icon: Package },
    ]
    
    // SMSH BN only gets Dashboard and Products (orders are on dashboard)
    const brandSlugLower = brandSlug.toLowerCase()
    if (brandSlugLower === 'smsh-bn' || brandSlugLower === 'smsh bn') {
      return baseItems
    }
    
    // All other brands get all pages
    return [
      ...baseItems,
      { href: `/brands/${brandSlug}/orders`, label: 'Orders', icon: FileText },
      { href: `/brands/${brandSlug}/suppliers`, label: 'Suppliers', icon: Store },
      { href: `/brands/${brandSlug}/locations`, label: 'Locations', icon: MapPin },
    ]
  }
  
  const navItems = getNavItems()

  return (
    <nav className="border-b border-brand-light bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-6">
            <Link href={`/brands/${brandSlug}/dashboard`} className="flex items-center space-x-3 group">
              {!logoError ? (
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg ring-2 ring-brand-primary/20 group-hover:ring-brand-primary/40 transition-all">
                  <Image
                    src={getBrandLogo(brandSlug, brandName)}
                    alt={getBrandLogoAlt(brandSlug, brandName)}
                    fill
                    className="object-contain"
                    unoptimized
                    onError={() => setLogoError(true)}
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-white font-bold text-lg flex-shrink-0 shadow-md">
                  {brandName.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <div className="hidden sm:flex items-center">
              <span className="text-base sm:text-lg font-semibold text-gray-900">{brandName}</span>
            </div>
            {/* Desktop Navigation */}
            <div className="hidden lg:flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-primary text-white shadow-md'
                        : 'text-brand-text hover:bg-brand-light hover:text-brand-primary'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Desktop Switch Brand */}
            <Link
              href="/brand-select"
              className="hidden sm:block text-sm text-gray-600 hover:text-gray-900"
            >
              Switch Brand
            </Link>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-brand-text hover:bg-brand-light transition-all"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4">
            <div className="mb-3 px-4">
              <span className="text-base font-semibold text-gray-900">{brandName}</span>
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 rounded-lg px-4 py-3 text-base font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-primary text-white shadow-md'
                        : 'text-brand-text hover:bg-brand-light hover:text-brand-primary'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
              <Link
                href="/brand-select"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 rounded-lg px-4 py-3 text-base font-medium text-brand-text hover:bg-brand-light hover:text-brand-primary transition-all duration-200"
              >
                <span>Switch Brand</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

