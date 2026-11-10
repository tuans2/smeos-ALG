import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { createCustomerSegmentUseCase } from "@/modules/crm/use-cases/create-customer-segment.use-case"
import { listCustomerSegmentsUseCase } from "@/modules/crm/use-cases/list-customer-segments.use-case"
import { getCustomerSegmentUseCase } from "@/modules/crm/use-cases/get-customer-segment.use-case"
import { updateCustomerSegmentUseCase } from "@/modules/crm/use-cases/update-customer-segment.use-case"
import { deleteCustomerSegmentUseCase } from "@/modules/crm/use-cases/delete-customer-segment.use-case"
import { recordCustomerInteractionUseCase } from "@/modules/crm/use-cases/record-customer-interaction.use-case"
import { listCustomerInteractionsUseCase } from "@/modules/crm/use-cases/list-customer-interactions.use-case"

describe("Marketing & Sales Center — Cách ly tenant cho Chăm sóc khách hàng (Customer Care)", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    const caps = (t: Tenant) => ({
      ...t,
      ctx: { ...t.ctx, capabilities: new Set([...t.ctx.capabilities, "M4", "Q1"]) },
    })
    a = caps(a)
    b = caps(b)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("nhóm khách hàng tạo bởi tổ chức A chỉ thấy bởi A, B không thấy", async () => {
    const segA = await createCustomerSegmentUseCase(a.ctx, {
      name: "Khách VIP Alpha",
      kind: "DYNAMIC",
      rules: { tiers: ["VIP"], minSpentVnd: 10_000_000 },
    })

    expect(segA.id).toBeDefined()
    expect(segA.organizationId).toBe(a.organizationId)
    expect(segA.name).toBe("Khách VIP Alpha")

    const listA = await listCustomerSegmentsUseCase(a.ctx)
    expect(listA.items).toHaveLength(1)
    expect(listA.items[0]?.id).toBe(segA.id)

    const listB = await listCustomerSegmentsUseCase(b.ctx)
    expect(listB.items).toHaveLength(0)
  })

  it("tổ chức B không thể xem, cập nhật hoặc xoá nhóm khách của A", async () => {
    const segA = await createCustomerSegmentUseCase(a.ctx, {
      name: "Nhóm nhạy cảm của A",
      kind: "DYNAMIC",
    })

    // B cố gắng lấy chi tiết -> null
    const findB = await getCustomerSegmentUseCase(b.ctx, segA.id)
    expect(findB).toBeNull()

    // B cố gắng cập nhật -> null
    const updateB = await updateCustomerSegmentUseCase(b.ctx, segA.id, {
      name: "B hack tên nhóm",
    })
    expect(updateB).toBeNull()

    // B cố gắng xoá -> false
    const deleteB = await deleteCustomerSegmentUseCase(b.ctx, segA.id)
    expect(deleteB).toBe(false)

    // A vẫn thấy nguyên vẹn
    const findA = await getCustomerSegmentUseCase(a.ctx, segA.id)
    expect(findA?.name).toBe("Nhóm nhạy cảm của A")
  })

  it("nhật ký tương tác cách ly theo tenant và không thể ghi cho khách của tenant khác", async () => {
    // Tạo khách hàng cho A
    const custA = await prisma.customers.create({
      data: {
        organization_id: a.organizationId,
        code: "KH-0001",
        name: "Khách của A",
        phone: "0123456789",
      },
    })

    // A ghi nhận tương tác chăm sóc
    const interA = await recordCustomerInteractionUseCase(a.ctx, {
      customerId: custA.id,
      channel: "ZALO",
      summary: "Gửi thiệp cảm ơn sau mua hàng",
      outcome: "Khách đã xem và phản hồi hài lòng",
    })

    expect(interA.id).toBeDefined()
    expect(interA.organizationId).toBe(a.organizationId)

    // A xem được
    const listA = await listCustomerInteractionsUseCase(a.ctx, { customerId: custA.id })
    expect(listA.items).toHaveLength(1)
    expect(listA.items[0]?.id).toBe(interA.id)

    // B truy vấn tương tác của khách A -> 0 kết quả
    const listB = await listCustomerInteractionsUseCase(b.ctx, { customerId: custA.id })
    expect(listB.items).toHaveLength(0)

    // B cố gắng ghi nhận tương tác cho khách của A -> ném lỗi
    await expect(
      recordCustomerInteractionUseCase(b.ctx, {
        customerId: custA.id,
        channel: "PHONE",
        summary: "B gọi trộm khách của A",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})

