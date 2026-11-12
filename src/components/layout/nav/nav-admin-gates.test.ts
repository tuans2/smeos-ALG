import { describe, expect, it } from "vitest"

import { defaultCodesForSystemRole } from "@/core/rbac/capability-catalog"
import { ROLE_UX_CATALOG } from "@/modules/organization/domain/role-ux-catalog"

import { buildNav } from "./index"

/** Màn quản trị theo quyền quản trị, không theo quyền đọc F1 (GD1 Bước 6 — A-08, S-03, PO 11/11/2026). */
describe("menu quản trị tiệm", () => {
  const navFor = (roleKey: "sale" | "dieu_phoi" | "dieu_hanh", uxKey: string) => {
    const codes = new Set(defaultCodesForSystemRole(roleKey))
    const nav = buildNav((code) => codes.has(code), ROLE_UX_CATALOG.find((r) => r.key === uxKey) ?? null)
    return nav.groups.flatMap((g) => g.entries.map((e) => e.label))
  }

  it("Sale không có Hồ sơ cửa hàng, Cài đặt tiệm, Đội ngũ & phân quyền", () => {
    const labels = navFor("sale", "sales")
    for (const label of ["Hồ sơ cửa hàng", "Cài đặt tiệm", "Đội ngũ & phân quyền"]) expect(labels).not.toContain(label)
  })

  it("Điều phối không có Đội ngũ; vẫn đủ mã mở trang Cài đặt tiệm (R5 — tab nhắc việc điều phối)", () => {
    expect(navFor("dieu_phoi", "coordinator")).not.toContain("Đội ngũ & phân quyền")
    expect(defaultCodesForSystemRole("dieu_phoi")).toContain("R5")
    expect(defaultCodesForSystemRole("sale")).not.toContain("R5")
    expect(defaultCodesForSystemRole("sale")).not.toContain("F2")
  })

  it("Điều hành có đủ", () => {
    const labels = navFor("dieu_hanh", "store_admin")
    for (const label of ["Hồ sơ cửa hàng", "Cài đặt tiệm", "Đội ngũ & phân quyền"]) expect(labels).toContain(label)
  })
})
