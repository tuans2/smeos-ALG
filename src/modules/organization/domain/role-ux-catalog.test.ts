import { describe, expect, it } from "vitest"

import { SYSTEM_ROLES } from "./system-roles"
import {
  ROLE_UX_CATALOG,
  getRoleUx,
  orderByRolePriority,
  resolveRoleUx,
} from "./role-ux-catalog"

describe("danh mục 18 vai trải nghiệm (Role & Capability Architecture)", () => {
  it("đủ 18 vai, khoá không trùng", () => {
    expect(ROLE_UX_CATALOG).toHaveLength(18)
    expect(new Set(ROLE_UX_CATALOG.map((r) => r.key)).size).toBe(18)
  })

  it("đúng 14 vai đang dùng được (gồm 4 Top-Level Roles và 3 vai vận hành PO Q7)", () => {
    const available = ROLE_UX_CATALOG.filter((r) => r.status === "AVAILABLE").map((r) => r.key)
    expect(available.sort()).toEqual([
      "coordinator",
      "crm",
      "customer_service",
      "finance_accounting",
      "florist",
      "flower_network_admin",
      "industry_admin",
      "lead_marketing",
      "marketing",
      "platform_admin",
      "product_manager",
      "sales",
      "shipper",
      "store_admin",
    ])
  })

  it("vai marketing (FLOWER_NETWORK) AVAILABLE nhưng chưa gắn vai phân quyền (nợ #165)", () => {
    const mkt = ROLE_UX_CATALOG.find((r) => r.key === "marketing")
    expect(mkt?.status).toBe("AVAILABLE")
    expect(mkt?.homepage).toBe("CREATIVE_WORKSPACE")
    expect(mkt?.systemRoleKeys).toHaveLength(0)
  })

  it("vai đang phát triển không có trang chủ, không nơi vào, không gắn vai phân quyền, có số nợ", () => {
    for (const role of ROLE_UX_CATALOG.filter((r) => r.status === "IN_DEVELOPMENT")) {
      expect(role.homepage).toBe("NOT_BUILT")
      expect(role.entryHref).toBeNull()
      expect(role.systemRoleKeys).toHaveLength(0)
      expect(role.debtRefs.length).toBeGreaterThan(0)
    }
  })

  it("mỗi vai phân quyền chỉ gắn tối đa một khuôn, và chỉ gắn vai hệ thống có thật", () => {
    const systemKeys = SYSTEM_ROLES.map((r) => r.key as string)
    const seen = new Map<string, string>()
    for (const role of ROLE_UX_CATALOG) {
      for (const key of role.systemRoleKeys) {
        expect(systemKeys).toContain(key)
        expect(seen.has(key)).toBe(false)
        seen.set(key, role.key)
      }
    }
  })

  it("platform_admin không phải vai của tổ chức", () => {
    expect(getRoleUx("platform_admin").systemRoleKeys).toHaveLength(0)
    expect(getRoleUx("platform_admin").entryHref).toBe("/van-hanh")
  })

  it("hỗ trợ alias store_manager trỏ về store_admin", () => {
    expect(getRoleUx("store_manager").key).toBe("store_admin")
  })
})

describe("resolveRoleUx", () => {
  it("ánh xạ bảy vai hệ thống sang khuôn tương ứng", () => {
    expect(resolveRoleUx("dieu_hanh")?.key).toBe("store_admin")
    expect(resolveRoleUx("sale")?.key).toBe("sales")
    expect(resolveRoleUx("dieu_phoi")?.key).toBe("coordinator")
    expect(resolveRoleUx("product_manager")?.key).toBe("product_manager")
    expect(resolveRoleUx("marketing")?.key).toBe("lead_marketing")
    expect(resolveRoleUx("crm")?.key).toBe("crm")
    expect(resolveRoleUx("customer_service")?.key).toBe("customer_service")
  })

  it("ba vai vận hành PO Q7 có trang chủ riêng", () => {
    expect(resolveRoleUx("tho_cam")?.homepage).toBe("FLORIST_QUEUE")
    expect(resolveRoleUx("shipper")?.homepage).toBe("SHIPPER_DELIVERIES")
    expect(resolveRoleUx("ke_toan")?.homepage).toBe("ACCOUNTING_WORKSPACE")
  })

  it("tổ chức CHAIN giải dieu_hanh sang flower_network_admin (FLOWER_NETWORK đã gộp vào CHAIN — ADR-012 T-8b)", () => {
    expect(resolveRoleUx("dieu_hanh", "CHAIN")?.key).toBe("flower_network_admin")
  })

  it("tổ chức STORE hoặc SINGLE giải dieu_hanh sang store_admin", () => {
    expect(resolveRoleUx("dieu_hanh", "STORE")?.key).toBe("store_admin")
    expect(resolveRoleUx("dieu_hanh", "SINGLE")?.key).toBe("store_admin")
  })

  it("tổ chức PLATFORM hoặc vai platform_admin giải sang platform_admin", () => {
    expect(resolveRoleUx("platform_admin")?.key).toBe("platform_admin")
    expect(resolveRoleUx(null, "PLATFORM")?.key).toBe("platform_admin")
    expect(resolveRoleUx("dieu_hanh", "PLATFORM")?.key).toBe("platform_admin")
    expect(resolveRoleUx("platform_admin")?.homepage).toBe("PLATFORM_JOURNEY_HOME")
    expect(resolveRoleUx("platform_admin")?.entryHref).toBe("/van-hanh")
  })

  it("tổ chức INDUSTRY hoặc vai industry_admin giải sang industry_admin", () => {
    expect(resolveRoleUx("industry_admin")?.key).toBe("industry_admin")
    expect(resolveRoleUx(null, "INDUSTRY")?.key).toBe("industry_admin")
    expect(resolveRoleUx("dieu_hanh", "INDUSTRY")?.key).toBe("industry_admin")
    expect(resolveRoleUx("industry_admin")?.homepage).toBe("INDUSTRY_JOURNEY_HOME")
    expect(resolveRoleUx("industry_admin")?.entryHref).toBe("/")
  })

  it("experience_user, vai riêng của tổ chức, rỗng → null (giữ hành vi cũ)", () => {
    expect(resolveRoleUx("experience_user")).toBeNull()
    expect(resolveRoleUx("tho_cam_rieng")).toBeNull()
    expect(resolveRoleUx(null)).toBeNull()
    expect(resolveRoleUx(undefined)).toBeNull()
  })
})

describe("orderByRolePriority", () => {
  const items = [
    { href: "/" },
    { href: "/san-pham" },
    { href: "/don-hang" },
    { href: "/dieu-phoi" },
    { href: "/khach-hang" },
  ]

  it("không có vai thì giữ nguyên", () => {
    expect(orderByRolePriority(items, null)).toEqual({ priority: [], rest: items })
  })

  it("đưa mục ưu tiên lên trước theo đúng thứ tự khai báo, không thêm bớt mục", () => {
    const { priority, rest } = orderByRolePriority(items, getRoleUx("coordinator"))
    expect(priority.map((i) => i.href)).toEqual(["/dieu-phoi", "/don-hang", "/san-pham", "/khach-hang"])
    expect(rest.map((i) => i.href)).toEqual(["/"])
    expect(priority.length + rest.length).toBe(items.length)
  })

  it("bỏ qua mục ưu tiên không có trong danh sách (đã bị ẩn theo năng lực)", () => {
    const { priority } = orderByRolePriority([{ href: "/" }, { href: "/don-hang" }], getRoleUx("sales"))
    expect(priority.map((i) => i.href)).toEqual(["/don-hang"])
  })
})
