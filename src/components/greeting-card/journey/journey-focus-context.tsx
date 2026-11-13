"use client"

import React, { createContext, useContext, useState, useMemo } from "react"

export type JourneyFocusBlock = 1 | 2 | 3

interface JourneyFocusContextType {
  activeBlock: JourneyFocusBlock
  setActiveBlock: (block: JourneyFocusBlock) => void
}

const JourneyFocusContext = createContext<JourneyFocusContextType | null>(null)

export function JourneyFocusProvider({ children }: { children: React.ReactNode }) {
  const [activeBlock, setActiveBlock] = useState<JourneyFocusBlock>(1)

  const value = useMemo(() => ({ activeBlock, setActiveBlock }), [activeBlock])

  return (
    <JourneyFocusContext.Provider value={value}>
      {children}
    </JourneyFocusContext.Provider>
  )
}

export function useJourneyFocus() {
  const ctx = useContext(JourneyFocusContext)
  if (!ctx) {
    return {
      activeBlock: 1 as JourneyFocusBlock,
      setActiveBlock: () => {},
    }
  }
  return ctx
}
