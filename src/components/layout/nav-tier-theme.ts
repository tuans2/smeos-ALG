/**
 * nav-tier-theme.ts — Nhận diện tầng kiến trúc trên sidebar.
 * Mỗi tầng (Mother / SaaS Ngành / ChainOS / StoreOS) có một màu nhận diện riêng,
 * dùng cho logo không gian làm việc và dải nhấn trên cùng sidebar.
 */

export type NavTierKey = "mother" | "industry" | "chain" | "store"

export function resolveNavTier(organizationType?: string | null, roleKey?: string | null): NavTierKey {
  if (organizationType === "PLATFORM" || roleKey === "platform_admin") return "mother"
  if (organizationType === "INDUSTRY" || roleKey === "industry_admin") return "industry"
  if (
    organizationType === "CHAIN" ||
    roleKey === "flower_network_admin"
  )
    return "chain"
  return "store"
}

export const NAV_TIER_THEME: Record<NavTierKey, { logo: string; accent: string }> = {
  mother: { logo: "bg-tone-indigo", accent: "bg-tone-indigo/80" },
  industry: { logo: "bg-tone-amber", accent: "bg-accent" },
  chain: { logo: "bg-tone-blue", accent: "bg-tone-blue" },
  store: { logo: "bg-primary", accent: "bg-primary" },
}
