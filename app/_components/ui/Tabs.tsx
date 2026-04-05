'use client'

import React from 'react'

interface TabItem {
  label: string
  value: string
}

interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (value: string) => void
  className?: string
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  className = '',
}: TabsProps) {
  return (
    <div
      role="tablist"
      className={[
        'flex overflow-x-auto gap-1 p-1 rounded-full bg-foreground/5 w-fit max-w-full',
        'scrollbar-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab

        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={[
              'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-150 cursor-pointer shrink-0 outline-none',
              'focus-visible:ring-2 focus-visible:ring-foreground/30',
              isActive
                ? 'bg-foreground text-background shadow-sm'
                : 'text-foreground/60 hover:text-foreground',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
