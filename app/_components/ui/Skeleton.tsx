import React from 'react'

interface SkeletonProps {
  variant?: 'card' | 'text' | 'circle'
  className?: string
}

const variantClasses: Record<NonNullable<SkeletonProps['variant']>, string> = {
  card: 'w-full h-48 rounded-xl',
  text: 'w-full h-4 rounded',
  circle: 'w-10 h-10 rounded-full',
}

export default function Skeleton({
  variant = 'text',
  className = '',
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="로딩 중"
      className={[
        'animate-pulse bg-foreground/10',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  )
}
