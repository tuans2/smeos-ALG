import { randomUUID } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import { TrashRepository } from "@/modules/storage/infra/trash-repository"
import { createProduct } from "@/modules/products/use-cases/create-product"
import { getPricingRules } from "@/modules/products/use-cases/get-pricing-rules"
import { putPricingRules } from "@/modules/products/use-cases/put-pricing-rules"
import { updateProduct } from "@/modules/products/use-cases/update-product"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * ADR-012 D-T7, bước T-5b (đợt 2): nhân viên chi nhánh A không thấy, không sửa được sản phẩm và quy tắc giá của chi nhánh
 * B — kể cả đường ghi (sửa, đổi trạng thái, thùng rác) và gán sang chi nhánh khác. Sản phẩm dùng chung ai cũng thấy.
 */
describe("phạm vi chi nhánh đợt 2 — sản phẩm, thùng rác, quy tắc giá", () => {
  let a: Tenant
  let q1: string
  let q3: string
  let staff: TenantContext

  const product = async (code: string, branchId: string | null) =>
    (await prisma.products.create({ data: { id: randomUUID(), organization_id: a.organizationId, code, name: code, branch_id: branchId } })).id

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    q1 = (await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Q1", code: "Q1" } })).id
    q3 = (await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Q3", code: "Q3" } })).id
    staff = { ...a.ctx, branchId: q1, capabilities: new Set(["L1", "L2", "L3", "L5", "H3"]) }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("sửa sản phẩm: chi nhánh khác → 404; chi nhánh mình và dùng chung sửa được; không chuyển sang chi nhánh khác", async () => {
    const own = await product("SP-1", q1)
    const shared = await product("SP-0", null)
    const other = await product("SP-3", q3)
    await expect(updateProduct(staff, other, { name: "đổi" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect((await prisma.products.findUniqueOrThrow({ where: { id: other } })).name).toBe("SP-3")
    await updateProduct(staff, own, { name: "Mẫu Q1" })
    await updateProduct(staff, shared, { name: "Mẫu chung" })
    expect((await prisma.products.findUniqueOrThrow({ where: { id: own } })).name).toBe("Mẫu Q1")
    await expect(updateProduct(staff, own, { branchId: q3 })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect((await prisma.products.findUniqueOrThrow({ where: { id: own } })).branch_id).toBe(q1)
  })

  it("tạo sản phẩm: chỉ cho chi nhánh mình hoặc dùng chung", async () => {
    await expect(createProduct(staff, { code: "SP-X", name: "X", branchId: q3 })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await createProduct(staff, { code: "SP-Y", name: "Y", branchId: q1 })
    await createProduct(staff, { code: "SP-Z", name: "Z" })
    expect(await prisma.products.count({ where: { organization_id: a.organizationId } })).toBe(2)
  })

  it("thùng rác: sản phẩm chi nhánh khác không hiện, không chuyển vào/khôi phục/xoá được", async () => {
    const other = await product("SP-3", q3)
    const own = await product("SP-1", q1)
    const trash = new TrashRepository()
    expect(await trash.moveToTrash(staff, { id: other, type: "PRODUCT" })).toBe(false)
    expect(await trash.moveToTrash(staff, { id: own, type: "PRODUCT" })).toBe(true)
    await trash.moveToTrash(a.ctx, { id: other, type: "PRODUCT" })
    expect((await trash.listTrash(staff)).filter((i) => i.type === "PRODUCT").map((i) => i.id)).toEqual([own])
    expect(await trash.restoreFromTrash(staff, { id: other, type: "PRODUCT" })).toBe(false)
    expect(await trash.permanentDelete(staff, { id: other, type: "PRODUCT" })).toBe("not_found")
  })

  it("quy tắc giá: chỉ xem cấu hình chi nhánh mình; không ghi được quy tắc toàn tổ chức hay chi nhánh khác", async () => {
    expect((await getPricingRules(staff, q3)).branch_id).toBe(q1)
    expect((await getPricingRules(a.ctx, q3)).branch_id).toBe(q3)
    const writer: TenantContext = { ...staff, capabilities: new Set([...staff.capabilities, "L6"]) }
    await expect(putPricingRules(writer, { key: "optimal_price_ratio", value: 0.6 })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(putPricingRules(writer, { key: "optimal_price_ratio", value: 0.6, branchId: q3 })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await putPricingRules(writer, { key: "optimal_price_ratio", value: 0.6, branchId: q1 })
    expect(await prisma.pricing_rules.count({ where: { organization_id: a.organizationId, branch_id: q1 } })).toBe(1)
  })
})
