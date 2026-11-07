import { describe, expect, it, vi } from "vitest"

// Giá sàn có test riêng (price-floor.test.ts, tests/tenant/below-floor.test.ts) — ở đây cô lập khỏi CSDL
vi.mock("@/modules/costing/use-cases/price-floor-guard", () => ({ assertNotBelowFloor: vi.fn(async () => undefined) }))
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { OrderRecord } from "@/modules/orders/domain/order-types"
import type { Quotation, QuotationStatus } from "../domain/quotation"
import type {
  CreateQuotationDTO,
  IQuotationRepository,
  QuotationFilter,
  UpdateQuotationDTO,
} from "../domain/repositories/quotation-repository.interface"
import { convertQuotationToOrderUseCase } from "./convert-quotation-to-order.use-case"
import { createQuotationUseCase } from "./create-quotation.use-case"
import { getQuotationUseCase } from "./get-quotation.use-case"
import { listQuotationsUseCase } from "./list-quotations.use-case"
import { sendQuotationUseCase } from "./send-quotation.use-case"
import { updateQuotationUseCase } from "./update-quotation.use-case"

const fakeCtx: TenantContext = {
  organizationId: "org-test-1",
  userId: "user-1",
  capabilities: new Set(["R15", "Q1"]),
  workspaceId: "ws-1",
  branchId: "br-1",
}

function createInMemoryQuotationRepo(): IQuotationRepository {
  const store: Map<string, Quotation> = new Map()
  let seq = 1

  return {
    async generateNextCode(): Promise<string> {
      return `BG-${(seq++).toString().padStart(4, "0")}`
    },
    async create(_ctx: TenantContext, dto: CreateQuotationDTO): Promise<Quotation> {
      const id = `quote-${Math.random().toString(36).substring(2, 9)}`
      const quotation: Quotation = {
        id,
        organizationId: _ctx.organizationId,
        code: dto.code,
        publicToken: `token-${id}`,
        leadId: dto.leadId ?? null,
        customerId: dto.customerId ?? null,
        assetUsageId: dto.assetUsageId ?? null,
        status: dto.status ?? "DRAFT",
        validUntil: dto.validUntil ?? null,
        subtotal: dto.subtotal,
        discountAmount: dto.discountAmount,
        shippingFee: dto.shippingFee,
        totalAmount: dto.totalAmount,
        terms: dto.terms ?? null,
        notes: dto.notes ?? null,
        convertedOrderId: null,
        createdBy: dto.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: dto.items.map((it, idx) => ({
          id: `item-${idx}`,
          name: it.name,
          qty: it.qty,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          productId: it.productId ?? null,
          note: it.note ?? null,
        })),
        lead: dto.leadId ? { id: dto.leadId, name: "Khách test", phone: "0901234567" } : null,
        customer: dto.customerId
          ? { id: dto.customerId, name: "Khách VIP", phone: "0912345678" }
          : null,
      }
      store.set(id, quotation)
      return quotation
    },
    async findById(_ctx: TenantContext, id: string): Promise<Quotation | null> {
      return store.get(id) ?? null
    },
    async findByCode(_ctx: TenantContext, code: string): Promise<Quotation | null> {
      for (const q of store.values()) {
        if (q.code === code) return q
      }
      return null
    },
    async findPublicByToken() {
      return null
    },
    async findForeignReferences() {
      return []
    },
    async claimConversion(_ctx: TenantContext, id: string, fromStatus: QuotationStatus) {
      const existing = store.get(id)
      if (!existing || existing.status !== fromStatus) return false
      store.set(id, { ...existing, status: "CONVERTED" })
      return true
    },
    async releaseConversion(_ctx: TenantContext, id: string, toStatus: QuotationStatus) {
      const existing = store.get(id)
      if (existing?.status === "CONVERTED" && !existing.convertedOrderId) {
        store.set(id, { ...existing, status: toStatus })
      }
    },
    async list(
      _ctx: TenantContext,
      filter?: QuotationFilter,
    ): Promise<{ items: Quotation[]; total: number; nextCursor?: string }> {
      let items = Array.from(store.values())
      if (filter?.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
        items = items.filter((q) => statuses.includes(q.status))
      }
      return { items, total: items.length }
    },
    async update(_ctx: TenantContext, id: string, dto: UpdateQuotationDTO): Promise<Quotation> {
      const existing = store.get(id)
      if (!existing) throw new Error("Not found")
      const updated: Quotation = {
        ...existing,
        status: dto.status ?? existing.status,
        validUntil: dto.validUntil !== undefined ? dto.validUntil : existing.validUntil,
        subtotal: dto.subtotal !== undefined ? dto.subtotal : existing.subtotal,
        discountAmount:
          dto.discountAmount !== undefined ? dto.discountAmount : existing.discountAmount,
        totalAmount: dto.totalAmount !== undefined ? dto.totalAmount : existing.totalAmount,
        terms: dto.terms !== undefined ? dto.terms : existing.terms,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        convertedOrderId:
          dto.convertedOrderId !== undefined ? dto.convertedOrderId : existing.convertedOrderId,
        updatedAt: new Date(),
        items: dto.items
          ? dto.items.map((it, idx) => ({
              id: `new-item-${idx}`,
              name: it.name,
              qty: it.qty,
              unitPrice: it.unitPrice,
              totalPrice: it.totalPrice,
              productId: it.productId ?? null,
              note: it.note ?? null,
            }))
          : existing.items,
      }
      store.set(id, updated)
      return updated
    },
    async countByStatus(_ctx: TenantContext): Promise<Record<QuotationStatus, number>> {
      const counts: Record<QuotationStatus, number> = {
        DRAFT: 0,
        SENT: 0,
        ACCEPTED: 0,
        REJECTED: 0,
        EXPIRED: 0,
        CONVERTED: 0,
      }
      for (const q of store.values()) {
        counts[q.status]++
      }
      return counts
    },
  }
}

describe("Quotation Use-Cases", () => {
  it("createQuotationUseCase: tính đúng subtotal, discount, total và sinh mã", async () => {
    const repo = createInMemoryQuotationRepo()
    const result = await createQuotationUseCase(
      fakeCtx,
      {
        items: [
          { name: "Sản phẩm A", qty: 2, unitPrice: 200000 },
          { name: "Sản phẩm B", qty: 1, unitPrice: 100000 },
        ],
        discountAmount: 50000,
        terms: "Thanh toán trong 3 ngày",
      },
      repo,
    )

    expect(result.code).toBe("BG-0001")
    expect(result.subtotal).toBe(500000)
    expect(result.discountAmount).toBe(50000)
    expect(result.totalAmount).toBe(450000)
    expect(result.status).toBe("DRAFT")
    expect(result.items).toHaveLength(2)
  })

  it("listQuotationsUseCase: trả về danh sách kèm phân nhóm đếm trạng thái", async () => {
    const repo = createInMemoryQuotationRepo()
    await createQuotationUseCase(
      fakeCtx,
      { items: [{ name: "Món 1", qty: 1, unitPrice: 100000 }] },
      repo,
    )
    await createQuotationUseCase(
      fakeCtx,
      { items: [{ name: "Món 2", qty: 1, unitPrice: 200000 }] },
      repo,
    )

    const list = await listQuotationsUseCase(fakeCtx, undefined, repo)
    expect(list.total).toBe(2)
    expect(list.counts.DRAFT).toBe(2)
  })

  it("updateQuotationUseCase: khách từ chối → lead gắn báo giá về Theo dõi (UJ-13)", async () => {
    const repo = createInMemoryQuotationRepo()
    const created = await createQuotationUseCase(fakeCtx, { leadId: "lead-1", items: [{ name: "Món 1", qty: 1, unitPrice: 100000 }] }, repo)
    await repo.update(fakeCtx, created.id, { status: "SENT" })
    const updateLeadFn = vi.fn(async () => undefined)
    await updateQuotationUseCase(fakeCtx, created.id, { status: "REJECTED" }, repo, { add: async () => undefined }, updateLeadFn)
    expect(updateLeadFn).toHaveBeenCalledWith(fakeCtx, "lead-1", "FOLLOW_UP")
  })

  it("getQuotationUseCase: tự động chuyển EXPIRED khi quá hạn", async () => {
    const repo = createInMemoryQuotationRepo()
    const created = await createQuotationUseCase(
      fakeCtx,
      {
        items: [{ name: "Món 1", qty: 1, unitPrice: 100000 }],
        validUntil: new Date(Date.now() - 3600000), // 1 hour ago
      },
      repo,
    )

    const fetched = await getQuotationUseCase(fakeCtx, created.id, repo)
    expect(fetched.status).toBe("EXPIRED")
    // Đọc không ghi — việc ghi do lượt quét định kỳ (UJ-11)
    expect((await repo.findById(fakeCtx, created.id))?.status).toBe("DRAFT")
  })

  it("sendQuotationUseCase: cập nhật trạng thái SENT và cập nhật lead sang QUOTATION_SENT", async () => {
    const repo = createInMemoryQuotationRepo()
    const created = await createQuotationUseCase(
      fakeCtx,
      {
        leadId: "lead-999",
        items: [{ name: "Món 1", qty: 1, unitPrice: 100000 }],
      },
      repo,
    )

    const updateLeadSpy = vi.fn().mockResolvedValue(true)
    const sent = await sendQuotationUseCase(fakeCtx, created.id, {
      repo,
      updateLeadFn: updateLeadSpy,
    })

    expect(sent.status).toBe("SENT")
    expect(updateLeadSpy).toHaveBeenCalledWith(fakeCtx, "lead-999", "QUOTATION_SENT")
  })

  it("convertQuotationToOrderUseCase: chuyển đổi báo giá sang đơn hàng qua ingestOrder", async () => {
    const repo = createInMemoryQuotationRepo()
    const created = await createQuotationUseCase(
      fakeCtx,
      {
        leadId: "lead-100",
        customerId: "cust-200",
        items: [{ name: "Bó hoa tươi A", qty: 2, unitPrice: 350000, note: "Gói giấy nến" }],
      },
      repo,
    )

    // Send first
    await sendQuotationUseCase(fakeCtx, created.id, { repo, updateLeadFn: vi.fn() })

    const fakeOrder: OrderRecord = {
      id: "ord-888",
      organizationId: fakeCtx.organizationId,
      code: "DH-0001",
      customerId: "cust-200",
      source: "QUOTATION",
      status: "DRAFT",
      productionStatus: "WAITING",
      deliveryStatus: "PENDING",
      totalVnd: 700000,
      createdBy: fakeCtx.userId!,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const ingestOrderSpy = vi.fn().mockResolvedValue(fakeOrder)

    const { quotation, order } = await convertQuotationToOrderUseCase(fakeCtx, created.id, {
      repo,
      ingestOrderFn: ingestOrderSpy,
    })

    expect(quotation.status).toBe("CONVERTED")
    expect(quotation.convertedOrderId).toBe("ord-888")
    expect(order.id).toBe("ord-888")

    expect(ingestOrderSpy).toHaveBeenCalledWith(
      fakeCtx,
      expect.objectContaining({
        source: "QUOTATION",
        customerId: "cust-200",
        leadId: "lead-100",
        items: [
          {
            productId: undefined,
            description: "Bó hoa tươi A",
            quantity: 2,
            unitPriceVnd: 350000,
            metadata: { note: "Gói giấy nến" },
          },
        ],
      }),
    )
  })
})

