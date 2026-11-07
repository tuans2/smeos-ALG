import { describe, expect, it, vi } from "vitest"

// Giá sàn có test riêng (price-floor.test.ts, tests/tenant/below-floor.test.ts) — ở đây cô lập khỏi CSDL
vi.mock("@/modules/costing/use-cases/price-floor-guard", () => ({ assertNotBelowFloor: vi.fn(async () => undefined) }))
import { AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { OrderRecord } from "@/modules/orders/domain/order-types"
import type { Quotation } from "../domain/quotation"
import type { IQuotationRepository } from "../domain/repositories/quotation-repository.interface"
import { convertQuotationToOrderUseCase } from "./convert-quotation-to-order.use-case"
import { createQuotationUseCase } from "./create-quotation.use-case"
import { updateQuotationUseCase } from "./update-quotation.use-case"

const ctx: TenantContext = {
  organizationId: "org-a",
  userId: "user-a",
  capabilities: new Set(["R15"]),
  workspaceId: "ws-a",
  branchId: "br-a",
}

const accepted: Quotation = {
  id: "q-1",
  organizationId: "org-a",
  code: "BG-0001",
  publicToken: "tok",
  status: "ACCEPTED",
  subtotal: 100,
  discountAmount: 0,
  shippingFee: 0,
  totalAmount: 100,
  createdBy: "user-a",
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [{ id: "i-1", name: "Hoa", qty: 1, unitPrice: 100, totalPrice: 100 }],
}

function repoStub(overrides: Partial<IQuotationRepository>): IQuotationRepository {
  const fail = () => {
    throw new Error("không được gọi")
  }
  return {
    create: vi.fn(fail),
    findById: vi.fn(async () => accepted),
    findByCode: vi.fn(fail),
    findPublicByToken: vi.fn(fail),
    findForeignReferences: vi.fn(async () => []),
    claimConversion: vi.fn(async () => true),
    releaseConversion: vi.fn(async () => undefined),
    list: vi.fn(fail),
    update: vi.fn(async () => ({ ...accepted, status: "CONVERTED" as const, convertedOrderId: "ord-1" })),
    countByStatus: vi.fn(fail),
    generateNextCode: vi.fn(async () => "BG-0002"),
    ...overrides,
  }
}

async function expectNotFound(promise: Promise<unknown>) {
  const err = await promise.catch((e: unknown) => e)
  expect(err).toBeInstanceOf(AppError)
  expect((err as AppError).code).toBe("NOT_FOUND")
}

describe("Báo giá — ID tham chiếu phải thuộc tổ chức đang thao tác", () => {
  it("tạo báo giá với khách của tổ chức khác → 404, không ghi gì", async () => {
    const repo = repoStub({ findForeignReferences: vi.fn(async () => ["customerId"]) })
    await expectNotFound(
      createQuotationUseCase(ctx, { customerId: "cust-of-b", items: [{ name: "Hoa", qty: 1, unitPrice: 1 }] }, repo),
    )
    expect(repo.findForeignReferences).toHaveBeenCalledWith(ctx, expect.objectContaining({ customerId: "cust-of-b" }))
    expect(repo.create).not.toHaveBeenCalled()
  })

  it("sửa dòng báo giá với sản phẩm của tổ chức khác → 404, không ghi gì", async () => {
    const repo = repoStub({
      findById: vi.fn(async () => ({ ...accepted, status: "DRAFT" as const })),
      findForeignReferences: vi.fn(async () => ["items.productId"]),
    })
    await expectNotFound(
      updateQuotationUseCase(ctx, "q-1", { items: [{ productId: "prod-of-b", name: "Hoa", qty: 1, unitPrice: 1 }] }, repo),
    )
    expect(repo.update).not.toHaveBeenCalled()
  })
})

describe("Báo giá — chuyển thành đơn chỉ một lần", () => {
  const order = { id: "ord-1" } as OrderRecord

  it("yêu cầu đến sau không chiếm được quyền chuyển → báo lỗi, không tạo đơn", async () => {
    const ingestOrderFn = vi.fn(async () => order)
    const repo = repoStub({ claimConversion: vi.fn(async () => false) })
    await expect(convertQuotationToOrderUseCase(ctx, "q-1", { repo, ingestOrderFn })).rejects.toBeInstanceOf(AppError)
    expect(ingestOrderFn).not.toHaveBeenCalled()
  })

  it("tạo đơn lỗi → trả báo giá về trạng thái cũ", async () => {
    const repo = repoStub({})
    const ingestOrderFn = vi.fn(async () => {
      throw new Error("ghi đơn lỗi")
    })
    await expect(convertQuotationToOrderUseCase(ctx, "q-1", { repo, ingestOrderFn })).rejects.toThrow("ghi đơn lỗi")
    expect(repo.releaseConversion).toHaveBeenCalledWith(ctx, "q-1", "ACCEPTED")
    expect(repo.update).not.toHaveBeenCalled()
  })

  it("báo giá đã gửi nhưng quá hạn hiệu lực → không tạo đơn với giá cũ (audit hành trình Q2, UJ-04)", async () => {
    const ingestOrderFn = vi.fn(async () => order)
    const repo = repoStub({
      findById: vi.fn(async () => ({ ...accepted, status: "SENT" as const, validUntil: new Date(Date.now() - 86400000) })),
    })
    const err = await convertQuotationToOrderUseCase(ctx, "q-1", { repo, ingestOrderFn }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AppError)
    expect(JSON.stringify((err as AppError).details)).toContain("hết hiệu lực")
    expect(repo.claimConversion).not.toHaveBeenCalled()
    expect(ingestOrderFn).not.toHaveBeenCalled()
  })

  it("báo giá khách đã đồng ý dù quá ngày hiệu lực vẫn tạo đơn được (UJ-04)", async () => {
    const ingestOrderFn = vi.fn(async () => order)
    const repo = repoStub({ findById: vi.fn(async () => ({ ...accepted, validUntil: new Date(Date.now() - 86400000) })) })
    await convertQuotationToOrderUseCase(ctx, "q-1", { repo, ingestOrderFn })
    expect(ingestOrderFn).toHaveBeenCalledTimes(1)
  })

  it("thông điệp chặn không lộ mã trạng thái (UJ-04)", async () => {
    const repo = repoStub({ findById: vi.fn(async () => ({ ...accepted, status: "REJECTED" as const })) })
    const err = await convertQuotationToOrderUseCase(ctx, "q-1", { repo, ingestOrderFn: vi.fn() }).catch((e: unknown) => e)
    expect(JSON.stringify((err as AppError).details)).not.toMatch(/REJECTED/)
    expect(JSON.stringify((err as AppError).details)).toContain("Khách từ chối")
  })
})
