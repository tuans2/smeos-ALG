/**
 * Mục "Tích hợp" trong sidebar của cả 4 tầng (Trung tâm Tích hợp GĐ1 — 30/10/2026).
 * Chèn ở bộ điều phối thay vì từng tệp nav-* để một chỗ quyết định vị trí: ngay sau mục cài đặt của tầng.
 * Kế hoạch: docs/kien-truc/KE_HOACH_TRUNG_TAM_TICH_HOP.md
 */

import type { GovernanceTier } from "@/core/governance/layered-resolver"
import type { NavEntry, NavView } from "./nav-types"

/** navKey của mục cài đặt mỗi tầng — mục Tích hợp đứng ngay sau nó, cùng nhóm. */
const ANCHOR_NAV_KEY: Record<GovernanceTier, string> = {
  MOTHER: "platform-config",
  INDUSTRY: "industry-settings",
  CHAIN: "chain-settings",
  STORE: "settings",
}

export function integrationsEntry(tier: GovernanceTier, group: string): NavEntry {
  if (tier === "MOTHER") {
    return { href: "/van-hanh/tich-hop", label: "Tích hợp", group, iconKey: "Plug", navKey: "platform-integrations", mobileLabel: "Tích hợp" }
  }
  return { href: "/tich-hop", label: "Tích hợp", group, iconKey: "Plug", navKey: "integrations", capability: "W1", mobileLabel: "Tích hợp" }
}

/**
 * Thêm mục Tích hợp vào nhóm chứa mục cài đặt của tầng. `can` lọc quyền W1 (tầng Mẹ gác bằng
 * console vận hành); `hiddenNavKeys` của ngành vẫn ẩn được mục này như mọi mục khác.
 */
export function withIntegrations(
  view: NavView,
  tier: GovernanceTier,
  can: (code: string) => boolean,
  hiddenNavKeys?: readonly string[] | null
): NavView {
  const anchor = ANCHOR_NAV_KEY[tier]
  const groupIndex = view.groups.findIndex((g) => g.entries.some((e) => e.navKey === anchor))
  const group = view.groups[groupIndex]
  if (!group) return view
  const entry = integrationsEntry(tier, group.key)
  if (entry.capability && !can(entry.capability)) return view
  if (hiddenNavKeys?.includes(entry.navKey)) return view
  if (group.entries.some((e) => e.navKey === entry.navKey)) return view
  const at = group.entries.findIndex((e) => e.navKey === anchor) + 1
  const entries = [...group.entries.slice(0, at), entry, ...group.entries.slice(at)]
  const groups = view.groups.map((g, i) => (i === groupIndex ? { ...g, entries } : g))
  return { ...view, groups }
}
