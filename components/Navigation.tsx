'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, Package, Store, MapPin, ShoppingCart, FileText, Tag } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
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

  return (
    <nav className="border-b border-brand-light bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-3 group">
              {/* Hungry Tum Logo - Place your logo file at /public/hungry-tum-logo.png or .svg */}
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
            <div className="flex space-x-1">
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
        </div>
      </div>
    </nav>
  )
}

