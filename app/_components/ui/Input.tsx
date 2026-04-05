'use client'

import React from 'react'

interface InputProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  error?: string
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}

export default function Input({
  placeholder,
  value,
  onChange,
  onKeyDown,
  error,
  disabled = false,
  className = '',
  autoFocus = false,
}: InputProps) {
  const inputId = React.useId()
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-1">
      <input
        id={inputId}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={[
          'w-full rounded-lg border bg-background px-4 py-3 text-foreground text-base transition-all duration-150 outline-none',
          'placeholder:text-foreground/40',
          error
            ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
            : 'border-foreground/20 focus:border-foreground/50 focus:ring-2 focus:ring-foreground/10',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
