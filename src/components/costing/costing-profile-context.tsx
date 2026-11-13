"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { IndustryCostingSpec } from "@/modules/organization/domain/industry-costing-spec"
import type { CostConfig } from "@/modules/costing/domain/costing-types"
import type { CostingProfile } from "./use-costing-api"

const Ctx = createContext<{ spec: IndustryCostingSpec; config: CostConfig } | null>(null)

export function CostingProfileProvider({ profile, children }: { profile: CostingProfile; children: ReactNode }) {
  if (!profile.spec || !profile.config) return null
  return <Ctx.Provider value={{ spec: profile.spec, config: profile.config }}>{children}</Ctx.Provider>
}

/** Hồ sơ ngành (đã xác nhận được hỗ trợ) cho các tab của `/tinh-gia`. */
export function useCostingProfile() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useCostingProfile phải dùng bên trong /tinh-gia")
  return v
}

export function categoryLabel(spec: IndustryCostingSpec, key: string): string {
  return spec.materialCategories.find((c) => c.key === key)?.label ?? key
}
