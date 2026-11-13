/**
 * Sidebar Tầng 4: StoreOS (Không gian làm việc cửa hàng)
 * Tư duy: Việc hôm nay — Công cụ (Thư viện) — Bán hàng — Sản phẩm — Vận hành — Quản trị.
 */

import type { RoleUxDefinition } from "@/modules/organization/domain/role-ux-catalog"
import { isRouteLocked } from "@/lib/feature-lock"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import { getHiddenNavKeys } from "../nav-matrix"
import type { NavEntry, NavGroup, NavView } from "./nav-types"
import { HOME_ENTRY } from "./nav-types"
import { STORE_NAV_ENTRIES, NAV_GROUP_CONFIG } from "./nav-store-entries"

export { STORE_NAV_ENTRIES, NAV_GROUP_CONFIG }

function adaptStoreEntries(industryKey?: string | null): readonly NavEntry[] {
  const hiddenKeys = getHiddenNavKeys(industryKey)
  const visible = hiddenKeys.size > 0
    ? STORE_NAV_ENTRIES.filter((e) => !hiddenKeys.has(e.navKey))
    : STORE_NAV_ENTRIES

  if (!industryKey || industryKey === "FLORAL") return visible
  const terms = getIndustryTerminology(industryKey)

  return visible.map((entry) => {
    if (entry.href === "/san-pham/tao-moi") {
      return { ...entry, label: terms.createButtonLabel, mobileLabel: "Tạo mới" }
    }
    if (entry.href === "/tai-anh") {
      return { ...entry, label: terms.scanButtonLabel, mobileLabel: "Quét ảnh" }
    }
    if (entry.href === "/san-pham/kha-dung") {
      if (industryKey === "HOMESTAY") return { ...entry, label: "Lịch phòng & Khả dụng", mobileLabel: "Lịch phòng" }
      if (industryKey === "FNB") return { ...entry, label: "Lịch phục vụ", mobileLabel: "Lịch bàn" }
      if (industryKey === "SERVICES") return { ...entry, label: "Lịch ca & Đặt hẹn", mobileLabel: "Lịch hẹn" }
      return { ...entry, label: "Khả dụng & Tồn kho", mobileLabel: "Khả dụng" }
    }
    return entry
  })
}

export function buildStoreNav(
  can: (code: string) => boolean,
  role: RoleUxDefinition | null,
  industryKey?: string | null,
  navHiddenKeys?: string[] | null,
  unlockedToolKeys?: string[] | null
): NavView {
  const baseEntries = adaptStoreEntries(industryKey)
  const extraHidden = new Set<string>(navHiddenKeys ?? [])
  const hasWhitelist = Array.isArray(unlockedToolKeys)
  const allowedWhitelist = new Set<string>(unlockedToolKeys ?? [])

  const entries = baseEntries.filter((e) => {
    if (extraHidden.has(e.navKey)) return false
    if (hasWhitelist && e.group === "cong-cu" && e.navKey !== "toolkit") {
      return allowedWhitelist.has(e.navKey)
    }
    return true
  })
  const isAccessible = (item: NavEntry) => !item.capability || can(item.capability)

  const pinnedHrefs = new Set<string>()
  const viecChinhEntries: NavEntry[] = []

  if (role && role.navPriority && role.navPriority.length > 0) {
    viecChinhEntries.push(HOME_ENTRY)
    pinnedHrefs.add(HOME_ENTRY.href)

    for (const href of role.navPriority) {
      if (pinnedHrefs.has(href)) continue
      const found = entries.find((entry) => entry.href === href)
      if (found && found.status !== "COMING_SOON" && !isRouteLocked(found.href) && isAccessible(found)) {
        viecChinhEntries.push(found)
        pinnedHrefs.add(found.href)
      }
    }
  }

  const groups: NavGroup[] = []

  if (viecChinhEntries.length > 0 && role) {
    groups.push({
      key: "viec-chinh",
      label: `Việc hôm nay · ${role.label}`,
      entries: viecChinhEntries,
    })
  } else if (role?.key === "store_admin") {
    groups.push({
      key: "viec-chinh",
      label: "Việc hôm nay",
      entries: [HOME_ENTRY],
    })
  }

  for (const config of NAV_GROUP_CONFIG) {
    const groupEntries = entries.filter(
      (entry) =>
        entry.group === config.key &&
        (config.key === "quan-tri" || !pinnedHrefs.has(entry.href)) &&
        isAccessible(entry)
    )
    if (groupEntries.length > 0) {
      groups.push({
        key: config.key,
        label: config.label,
        entries: groupEntries,
      })
    }
  }

  return { groups }
}
