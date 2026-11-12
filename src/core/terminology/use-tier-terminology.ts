"use client"

/**
 * use-tier-terminology.ts — Hook tra cứu Terminology theo Tầng (SSOT)
 *
 * Cung cấp giải pháp lấy thuật ngữ chuẩn hóa cho từng Tầng trong 4 tầng:
 * - Tầng 1: SaaS Mother (Platform Governance)
 * - Tầng 2: SaaS Ngành (Industry & Affiliate Network)
 * - Tầng 3: ChainOS (Chain HQ & Coordination)
 * - Tầng 4: StoreOS (Store Retail & Local Queue)
 *
 * Tích hợp trực tiếp với Master Registry của Tầng SaaS Mother.
 */

import { useMemo } from "react"
import { type AlgTier, type TierTerminologyMap, getTierTerminology } from "@/core/terminology"

export function useTierTerminology<T extends AlgTier>(tier: T): TierTerminologyMap[T] {
  return useMemo(() => getTierTerminology(tier), [tier])
}

/**
 * Hook hợp nhất lấy toàn bộ từ điển 4 tầng cho các màn hình điều phối / quản trị
 */
export function useAllTierTerminology() {
  return useMemo(
    () => ({
      saas: getTierTerminology("TIER_1_SAAS"),
      industry: getTierTerminology("TIER_2_INDUSTRY"),
      chain: getTierTerminology("TIER_3_CHAIN"),
      store: getTierTerminology("TIER_4_STORE"),
    }),
    []
  )
}
