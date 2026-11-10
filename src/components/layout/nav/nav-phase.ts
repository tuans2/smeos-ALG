/**
 * Chế độ giai đoạn bàn giao (`NEXT_PUBLIC_DELIVERY_PHASE`, kế hoạch GD1 Bước 2.2): menu chỉ còn mục có
 * trang trong phạm vi; nhóm rỗng thì bỏ. Tầng SaaS Ngành không có trong bản giao GD1 nên không có menu.
 * Không bật chế độ thì trả nguyên cây menu.
 */

import type { GovernanceTier } from "@/core/governance/layered-resolver"
import { activeDeliveryPhase, filterByPhase, type DeliveryPhase } from "@/lib/delivery/delivery-phase"
import type { NavView } from "./nav-types"

const TIERS_OUT_OF_PHASE: Record<DeliveryPhase, readonly GovernanceTier[]> = { gd1: ["INDUSTRY"] }

export function withDeliveryPhase(view: NavView, tier: GovernanceTier, phase = activeDeliveryPhase()): NavView {
  if (!phase) return view
  if (TIERS_OUT_OF_PHASE[phase].includes(tier)) return { groups: [] }
  const groups = view.groups
    .map((group) => ({ ...group, entries: filterByPhase(group.entries, (entry) => entry.href, phase) }))
    .filter((group) => group.entries.length > 0)
  return { ...view, groups }
}
