import React from 'react'

interface BadgeProps {
  count: number
  className?: string
}

type BadgeConfig = {
  colorClass: string
  label: string
}

function getBadgeConfig(count: number): BadgeConfig {
  if (count === 0) {
    return { colorClass: 'bg-green-500 text-white', label: '완벽!' }
  }
  if (count <= 2) {
    return { colorClass: 'bg-yellow-500 text-white', label: `+${count}개` }
  }
  return { colorClass: 'bg-orange-500 text-white', label: `+${count}개` }
}

export default function Badge({ count, className = '' }: BadgeProps) {
  const { colorClass, label } = getBadgeConfig(count)

  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        colorClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  )
}
