/**
 * Hệ thống Điều hướng 4 Tầng smeOS (Navigation Dispatcher)
 * Chuẩn hóa theo SSOT SMEOS_4_TIER_ARCHITECTURE_AND_NAVIGATION_SSOT.md
 */

import { isChainTier, tierOf } from "@/core/governance/tier-of"
import type { RoleUxDefinition } from "@/modules/organization/domain/role-ux-catalog"
import type { NavEntry, NavGroup, NavView, NavGroupKey } from "./nav-types"
import { HOME_ENTRY } from "./nav-types"
import { buildMotherNav, MOTHER_NAV_ENTRIES } from "./nav-mother"
import { buildIndustryNav, INDUSTRY_NAV_ENTRIES } from "./nav-industry"
import { buildChainNav, CHAIN_NAV_ENTRIES } from "./nav-chain"
import { buildStoreNav, STORE_NAV_ENTRIES } from "./nav-store"
import { withIntegrations } from "./nav-integrations"
import { withDeliveryPhase } from "./nav-phase"
import { isHrefOpen } from "@/lib/feature-lock"

export * from "./nav-types"
export * from "./nav-mother"
export * from "./nav-industry"
export * from "./nav-chain"
export * from "./nav-store"
export * from "./nav-integrations"

/**
 * Kiểm tra xem tổ chức/vai trò có thuộc Tầng ChainOS hay không — luật ở `core/governance/tier-of.ts`.
 */
export function isChainOrganization(
  organizationType?: string | null,
  role?: RoleUxDefinition | null
): boolean {
  return isChainTier(organizationType, role)
}

/**
 * Điều phối sinh cây điều hướng (NavView) chuẩn theo đúng tầng kiến trúc:
 * 1. SaaS Mother: organizationType === "PLATFORM" hoặc roleKey === "platform_admin"
 * 2. SaaS Ngành: organizationType === "INDUSTRY" hoặc roleKey === "industry_admin"
 * 3. ChainOS: organizationType === "CHAIN" hoặc roleKey thuộc nhóm Chuỗi
 * 4. StoreOS: Cửa hàng cơ sở đơn lẻ (organizationType === "SINGLE" hoặc mặc định)
 */
export function buildNav(
  canCode: (code: string) => boolean,
  role: RoleUxDefinition | null,
  industryKey?: string | null,
  navHiddenKeys?: string[] | null,
  organizationType?: string | null,
  unlockedToolKeys?: string[] | null
): NavView {
  // Mục menu khai `capability: "F2|R5"` = có một trong các mã là thấy
  const can = (code: string) => code.split("|").some((c) => canCode(c.trim()))
  const tier = tierOf(organizationType, role)
  return withDeliveryPhase(withIntegrations(buildTierNav(), tier, can, navHiddenKeys), tier)

  function buildTierNav(): NavView {
    switch (tier) {
      case "INDUSTRY":
        return buildIndustryNav(can) // Tầng 2: SaaS Ngành
      case "MOTHER":
        return buildMotherNav(can) // Tầng 1: SaaS Mother
      case "CHAIN":
        return buildChainNav(can, role) // Tầng 3: ChainOS
      case "STORE":
        return buildStoreNav(can, role, industryKey, navHiddenKeys, unlockedToolKeys) // Tầng 4: StoreOS
    }
  }
}

/**
 * Ô thứ hai của thanh dưới trên mobile (Mobile Second Slot)
 */
export function mobileSecondSlot(
  can: (code: string) => boolean,
  role: RoleUxDefinition | null,
  industryKey?: string | null,
  navHiddenKeys?: string[] | null,
  organizationType?: string | null
): NavEntry {
  const tier = tierOf(organizationType, role)
  // Tầng 2: SaaS Ngành (tierOf kiểm trước Mẹ vì industry_admin có group="PLATFORM")
  if (tier === "INDUSTRY") {
    return {
      href: "/san-pham",
      label: "Sản phẩm mẫu",
      group: "san-pham-nganh",
      iconKey: "Package",
      navKey: "industry-products",
      mobileLabel: "Sản phẩm",
    }
  }

  // Tầng 1: SaaS Mother
  if (tier === "MOTHER") {
    return {
      href: "/van-hanh/to-chuc",
      label: "Tổ chức & Tenant",
      group: "to-chuc-dich-vu",
      iconKey: "Building2",
      navKey: "platform-organizations",
      mobileLabel: "Tổ chức",
    }
  }

  // Điều phối đang khoá "Sắp ra mắt" (production) thì chuỗi dùng ô mặc định Đơn hàng (audit N-05)
  if (tier === "CHAIN" && isHrefOpen("/dieu-phoi")) {
    return {
      href: "/dieu-phoi",
      label: "Điều phối",
      group: "dieu-hanh-chuoi",
      iconKey: "Radio",
      navKey: "chain-coordinator",
      mobileLabel: "Điều phối",
    }
  }

  return {
    href: "/don-hang",
    label: "Đơn hàng",
    group: "ban-hang",
    iconKey: "ShoppingBag",
    navKey: "orders",
    mobileLabel: "Đơn hàng",
  }
}
