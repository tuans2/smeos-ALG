import { describe, expect, it } from "vitest"

import {
  ownedByTenant,
  scopedData,
  scopedWhere,
  TenantScopeViolation,
  type TenantContext,
} from "./tenant-context"

const ctx: TenantContext = {
  organizationId: "org-a",
  workspaceId: "ws-a",
  userId: "user-a",
  branchId: null,
  capabilities: new Set<string>(),
}

describe("bộ gác tổ chức", () => {
  it("chèn organization_id vào mệnh đề where rỗng", () => {
    expect(scopedWhere(ctx)).toEqual({ organization_id: "org-a" })
  })

  it("giữ nguyên điều kiện có sẵn", () => {
    expect(scopedWhere(ctx, { id: "x", is_active: true })).toEqual({
      id: "x",
      is_active: true,
      organization_id: "org-a",
    })
  })

  it("ném khi lời gọi tự khai organization_id trong where", () => {
    expect(() => scopedWhere(ctx, { organization_id: "org-b" })).toThrow(TenantScopeViolation)
  })

  it("ném khi lời gọi tự khai organization_id trong dữ liệu ghi", () => {
    expect(() => scopedData(ctx, { organization_id: "org-b", name: "x" })).toThrow(
      TenantScopeViolation
    )
  })

  it("gắn organization_id vào dữ liệu ghi", () => {
    expect(scopedData(ctx, { name: "Chi nhánh 1" })).toEqual({
      name: "Chi nhánh 1",
      organization_id: "org-a",
    })
  })

  it("bản ghi của tổ chức khác trả null, không ném lỗi quyền", () => {
    expect(ownedByTenant(ctx, { organization_id: "org-b" })).toBeNull()
    expect(ownedByTenant(ctx, { organization_id: "org-a" })).not.toBeNull()
    expect(ownedByTenant(ctx, null)).toBeNull()
  })
})
