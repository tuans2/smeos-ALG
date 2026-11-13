"use client"

import React, { useEffect, useState } from "react"
import type { BusinessModuleKey } from "@/modules/marketing-center/domain/asset-type"
import type { ModuleKpiStrip } from "@/modules/marketing-center/domain/kpi-definitions"

interface ModuleKpiStripProps {
  moduleKey: string
}

export function ModuleKpiStripComponent({ moduleKey }: ModuleKpiStripProps) {
  const [strip, setStrip] = useState<ModuleKpiStrip | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true

    async function loadKpis() {
      try {
        const res = await fetch("/api/v1/marketing-center/kpis?time_window=30D")
        if (!res.ok) return
        const json = await res.json()
        const data = json.data as Record<BusinessModuleKey, ModuleKpiStrip>
        if (isMounted && data && data[moduleKey as BusinessModuleKey]) {
          setStrip(data[moduleKey as BusinessModuleKey])
        }
      } catch {
        // Lỗi mạng âm thầm bỏ qua để không gián đoạn giao diện
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadKpis()

    return () => {
      isMounted = false
    }
  }, [moduleKey])

  if (isLoading || !strip || !strip.hasData || strip.items.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {strip.items.slice(0, 3).map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface-alt/70 text-caption transition-colors hover:border-primary/40"
          title={item.description}
        >
          <span className="text-text-muted font-medium">{item.label}:</span>
          <span className="font-bold text-text">{item.formattedValue}</span>
        </div>
      ))}
    </div>
  )
}

