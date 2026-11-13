"use client"

import React, { createContext, useCallback, useContext, useState } from "react"

export type AnnounceTone = "polite" | "assertive"

interface LiveRegionContextValue {
  announce: (text: string, tone?: AnnounceTone) => void
}

const LiveRegionContext = createContext<LiveRegionContextValue | null>(null)

export function LiveRegionProvider({ children }: { children: React.ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState("")
  const [assertiveMessage, setAssertiveMessage] = useState("")

  const announce = useCallback((text: string, tone: AnnounceTone = "polite") => {
    if (tone === "assertive") {
      setAssertiveMessage("")
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAssertiveMessage(text)
        })
      })
    } else {
      setPoliteMessage("")
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPoliteMessage(text)
        })
      })
    }
  }, [])

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  )
}

export function useAnnounce() {
  const context = useContext(LiveRegionContext)
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      announce: (_text: string, _tone?: AnnounceTone) => {},
    }
  }
  return context
}
