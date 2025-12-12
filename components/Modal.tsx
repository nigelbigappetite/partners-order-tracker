'use client'

import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      <div className="relative z-50 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-lg bg-white p-4 sm:p-6 shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 sm:pb-4 mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto -mx-4 sm:mx-0 px-4 sm:px-0">{children}</div>
      </div>
    </div>
  )
}

