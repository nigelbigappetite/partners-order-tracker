'use client'

interface StatusPillProps {
  status: string
}

const statusColors: Record<string, string> = {
  'New': 'bg-blue-500 text-white',
  'Ordered with Supplier': 'bg-amber-500 text-white',
  'In Transit': 'bg-indigo-500 text-white',
  'Delivered': 'bg-emerald-500 text-white',
  'Completed': 'bg-slate-600 text-white',
}

export default function StatusPill({ status }: StatusPillProps) {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-700'
  
  // Shortened status labels for compact display
  const statusLabels: Record<string, string> = {
    'New': 'New',
    'Ordered with Supplier': 'Ordered',
    'In Transit': 'In Transit',
    'Delivered': 'Delivered',
    'Completed': 'Done',
  }
  
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${colorClass} shadow-sm`}>
      {statusLabels[status] || status}
    </span>
  )
}

