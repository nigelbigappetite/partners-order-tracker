'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, Package, Store, MapPin, ShoppingCart, FileText, Tag, RefreshCw, Menu, X } from 'lucide-react'

const navItems = [
  { href: '/brands/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: FileText },
  { href: '/create-order', label: 'Create Order', icon: ShoppingCart },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/brands', label: 'Brands', icon: Tag },
  { href: '/suppliers', label: 'Suppliers', icon: Store },
  { href: '/locations', label: 'Locations', icon: MapPin },
]

export default function Navigation() {
  const pathname = usePathname()
  const [logoError, setLogoError] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="border-b border-brand-light bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <Link href="/brands/admin/dashboard" className="flex items-center space-x-3 group">
              {!logoError ? (
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg ring-2 ring-brand-primary/20 group-hover:ring-brand-primary/40 transition-all">
                  <Image
                    src="/Hungry Tum Logo.jpeg"
                    alt="Hungry Tum"
                    fill
                    className="object-contain"
                    unoptimized
                    onError={() => setLogoError(true)}
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-white font-bold text-lg flex-shrink-0 shadow-md">
                  HT
                </div>
              )}
            </Link>
            {/* Desktop Navigation */}
            <div className="hidden lg:flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href === '/brands/admin/dashboard' && pathname === '/')
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
              className="hidden sm:flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-brand-light hover:text-brand-primary transition-all duration-200"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Switch Brand</span>
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
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href === '/brands/admin/dashboard' && pathname === '/')
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
                <RefreshCw className="h-5 w-5" />
                <span>Switch Brand</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

