'use client'

import React from 'react'

interface TagProps {
  label: string
  variant?: 'default' | 'matched' | 'missing' | 'disabled'
  onRemove?: () => void
  className?: string
}

const variantClasses: Record<NonNullable<TagProps['variant']>, string> = {
  default: 'bg-foreground/10 text-foreground',
  matched:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  missing: 'bg-orange-100 text-orange-800',
  disabled: 'bg-gray-100 text-gray-400 opacity-60',
}

export default function Tag({
  label,
  variant = 'default',
  onRemove,
  className = '',
}: TagProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${label} 제거`}
          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3 w-3"
            aria-hidden="true"
          >
            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
          </svg>
        </button>
      )}
    </span>
  )
}
