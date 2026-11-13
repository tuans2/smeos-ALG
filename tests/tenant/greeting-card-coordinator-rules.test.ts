import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { BrochureOrderRepository } from "@/modules/greeting-card/infra/brochure-order-repository"
import { PhotoApprovalRepository } from "@/modules/greeting-card/infra/photo-approval-repository"
import { BrochurePaymentRepository } from "@/modules/greeting-card/infra/brochure-payment-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { cancelBrochureOrder } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { getCoordinatorBoard } from "@/modules/greeting-card/use-cases/coordinator-board"
import { getInbox } from "@/modules/greeting-card/use-cases/get-inbox"
import {
  assignBrochureFlorist,
  dispatchBrochureShipping,
  uploadBrochureProductPhoto,
  uploadBrochureRecipientPhoto,
} from "@/modules/greeting-card/use-cases/update-brochure-order-status"
import {
  BROCHURE_WORKFLOW_POLICY_KEY,
  LEAN_WORKFLOW_POLICY,
  STRICT_WORKFLOW_POLICY,
  serializeWorkflowPolicy,
  type BrochureWorkflowPolicy,
} from "@/modules/greeting-card/domain/brochure-workflow-policy"

/** Luật Điều phối PO 15/10/2026: bỏ qua ảnh (mục 1), chờ khách duyệt ảnh (mục 4), đơn giao còn nợ (mục 3), huỷ đơn đang giao (mục 6). */

const ORDER_INPUT = {
  customerName: "Khách Hàng", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-discount-10",
  deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10), deliveryAddress: "123 Đường Hoa, Quận 1",
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: luật Điều phối (PO 15/10/2026)", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function usePolicy(policy: BrochureWorkflowPolicy) {
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { [BROCHURE_WORKFLOW_POLICY_KEY]: serializeWorkflowPolicy(policy) } as Prisma.InputJsonValue } })
  }

  async function placeOrder() {
    const repo = new GreetingCardRepository()
    const product = await new ProductRepository().create(a.ctx, { code: `HOA-${randomUUID().slice(0, 6)}`, name: "Bó hoa", attributes: { price: 500000 } })
    const catalog = await repo.createCatalog(a.ctx, { code: `bo-${randomUUID().slice(0, 6)}`, name: "Bộ", productIds: [product.id], createdBy: a.userId })
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    return submitBrochureOrder(link.sendCode, ORDER_INPUT)
  }

  async function asset() {
    return prisma.assets.create({
      data: {
        id: randomUUID(), organization_id: a.organizationId, kind: "ORIGINAL", state: "READY", version: 1,
        storage_key: `org/${a.organizationId}/unfiled/${randomUUID()}.jpg`, mime_type: "image/jpeg", created_by: a.userId,
      },
    })
  }

  it("gói mặc định cho bỏ qua ảnh; gói Nghiêm ngặt chặn cả khi gọi thẳng API", async () => {
    const free = await placeOrder()
    await assignBrochureFlorist(a.ctx, free.orderId, { floristNote: "Thợ A" })
    await uploadBrochureProductPhoto(a.ctx, free.orderId, { skipPhoto: true })

    await usePolicy(STRICT_WORKFLOW_POLICY)
    const strict = await placeOrder()
    await assignBrochureFlorist(a.ctx, strict.orderId, { floristNote: "Thợ A" })
    expect(await codeOf(uploadBrochureProductPhoto(a.ctx, strict.orderId, { skipPhoto: true }))).toBe("CONFLICT")
    await uploadBrochureProductPhoto(a.ctx, strict.orderId, { assetId: (await asset()).id })
    await new PhotoApprovalRepository().recordApproval(await prisma.orders.findUniqueOrThrow({ where: { id: strict.orderId } }))
    await dispatchBrochureShipping(a.ctx, strict.orderId, { trackingNote: "Ship" })
    expect(await codeOf(uploadBrochureRecipientPhoto(a.ctx, strict.orderId, { skipPhoto: true }))).toBe("CONFLICT")
  })

  it("ảnh giao bắt buộc ở mọi gói; Điều hành tắt công tắc ảnh người nhận thì bỏ qua được (PO 04/11/2026, ALG 4.18)", async () => {
    await usePolicy(LEAN_WORKFLOW_POLICY)
    const order = await placeOrder()
    await assignBrochureFlorist(a.ctx, order.orderId, { floristNote: "Thợ A" })
    await uploadBrochureProductPhoto(a.ctx, order.orderId, { skipPhoto: true })
    await dispatchBrochureShipping(a.ctx, order.orderId, { trackingNote: "Ship" })
    expect(await codeOf(uploadBrochureRecipientPhoto(a.ctx, order.orderId, { skipPhoto: true }))).toBe("CONFLICT")
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })).delivery_status).toBe("DELIVERING")

    await usePolicy({ ...LEAN_WORKFLOW_POLICY, preset: "CUSTOM", requireDeliveryProofPhoto: false })
    await uploadBrochureRecipientPhoto(a.ctx, order.orderId, { skipPhoto: true, skipReason: "Khách nhận trực tiếp" })
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })).delivery_status).toBe("DELIVERED")
  })

  it("giao xong còn nợ → Đã giao chờ thu đủ; thu đủ → Hoàn tất (PO 04/11/2026, ALG 4.26)", async () => {
    await usePolicy({ ...LEAN_WORKFLOW_POLICY, preset: "CUSTOM", requireDeliveryProofPhoto: false })
    const order = await placeOrder()
    await assignBrochureFlorist(a.ctx, order.orderId, { floristNote: "Thợ A" })
    await uploadBrochureProductPhoto(a.ctx, order.orderId, { skipPhoto: true })
    await dispatchBrochureShipping(a.ctx, order.orderId, { trackingNote: "Ship" })
    await uploadBrochureRecipientPhoto(a.ctx, order.orderId, { skipPhoto: true, skipReason: "Khách nhận trực tiếp" })

    const delivered = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })
    expect(delivered).toMatchObject({ delivery_status: "DELIVERED", status: "DELIVERED" })
    expect(Number(delivered.balance_vnd)).toBeGreaterThan(0)

    await new BrochurePaymentRepository().recordIncomingPayment(a.ctx, order.orderId, {
      amountVnd: Number(delivered.balance_vnd), method: "CASH", reference: "thu-sau-giao", note: "Thu nốt",
    })
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })).status).toBe("COMPLETED")
  })

  it("chờ khách duyệt ảnh thì chưa giao ship được, Điều phối thấy đếm ngược; gói Tinh gọn không chờ", async () => {
    const order = await placeOrder()
    await assignBrochureFlorist(a.ctx, order.orderId, { floristNote: "Thợ A" })
    await uploadBrochureProductPhoto(a.ctx, order.orderId, { assetId: (await asset()).id })
    expect(await codeOf(dispatchBrochureShipping(a.ctx, order.orderId, { trackingNote: "Ship" }))).toBe("CONFLICT")
    const row = (await getCoordinatorBoard(a.ctx, {})).data.find((o) => o.id === order.orderId)
    expect(row?.photo_approval).toMatchObject({ status: "PENDING", countdownMinutes: 10 })

    await usePolicy(LEAN_WORKFLOW_POLICY)
    await dispatchBrochureShipping(a.ctx, order.orderId, { trackingNote: "Ship" })
  })

  it("đơn đã giao còn nợ: nhắc trong Hộp việc và lọc được ở báo cáo; tổ chức khác không thấy", async () => {
    const order = await placeOrder()
    await prisma.orders.update({ where: { id: order.orderId }, data: { delivery_status: "DELIVERED", status: "COMPLETED", updated_at: new Date(Date.now() - 20 * 86_400_000) } })
    const repo = new BrochureOrderRepository()
    expect((await repo.listDeliveredWithDebt(a.ctx, null)).map((d) => d.orderId)).toEqual([order.orderId])
    expect(await repo.listDeliveredWithDebt(b.ctx, null)).toHaveLength(0)
    const report = await repo.listBrochureOrders(a.ctx, { payment: "OUTSTANDING", delivered: true, limit: 20 })
    expect(report.map((o) => o.id)).toEqual([order.orderId])

    const inbox = await getInbox(a.ctx, "ADMIN")
    expect(inbox.actions.find((x) => x.id === `collect-post-delivery:${order.orderId}`)?.detail).toContain("đã giao 20 ngày")
  })

  it("huỷ trực tiếp đơn đang giao phải xác nhận đã đọc cảnh báo", async () => {
    const order = await placeOrder()
    await prisma.orders.update({ where: { id: order.orderId }, data: { delivery_status: "DELIVERING" } })
    expect(await codeOf(cancelBrochureOrder(a.ctx, order.orderId, "Khách đổi ý"))).toBe("CONFLICT")
    expect(await codeOf(cancelBrochureOrder(b.ctx, order.orderId, "Khách đổi ý", true))).toBe("NOT_FOUND")
    await cancelBrochureOrder(a.ctx, order.orderId, "Khách đổi ý", true)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })).status).toBe("CANCELLED")
  })

  it("tác vụ xưởng ghi bằng bản đọc cũ (đơn vừa huỷ / vừa có người làm) → 409, không hồi sinh đơn đã huỷ", async () => {
    const order = await placeOrder()
    await prisma.orders.update({ where: { id: order.orderId }, data: { production_status: "READY", delivery_status: "DELIVERING" } })
    const repo = new BrochureOrderRepository()
    const stale = await repo.findBrochureOrder(a.ctx, order.orderId)
    if (!stale) throw new Error("thiếu đơn")
    // Điều hành huỷ trong lúc Điều phối đang tải ảnh người nhận
    await cancelBrochureOrder(a.ctx, order.orderId, "Khách đổi ý", true)
    const complete = { eventType: "RECIPIENT_PHOTO_UPLOADED", deliveryStatus: "DELIVERED" as const, orderStatus: "COMPLETED" as const }
    expect(await codeOf(repo.applyProgress(a.ctx, stale, complete))).toBe("CONFLICT")
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })).status).toBe("CANCELLED")
    expect(await prisma.order_events.count({ where: { order_id: order.orderId, reason: "RECIPIENT_PHOTO_UPLOADED" } })).toBe(0)

    // Hai người cùng bấm "Giao ship": chỉ một lần được ghi
    const other = await placeOrder()
    await prisma.orders.update({ where: { id: other.orderId }, data: { production_status: "READY" } })
    const snapshot = await repo.findBrochureOrder(a.ctx, other.orderId)
    if (!snapshot) throw new Error("thiếu đơn")
    const dispatch = { eventType: "SHIPPING_DISPATCHED", deliveryStatus: "DELIVERING" as const }
    await repo.applyProgress(a.ctx, snapshot, dispatch)
    expect(await codeOf(repo.applyProgress(a.ctx, snapshot, dispatch))).toBe("CONFLICT")
    expect(await prisma.order_events.count({ where: { order_id: other.orderId, reason: "SHIPPING_DISPATCHED" } })).toBe(1)
  })

  it("mẫu chỉ có ảnh thư viện (chưa đặt ảnh chính) vẫn hiện ảnh trên bảng Điều phối", async () => {
    const order = await placeOrder()
    const item = await prisma.order_items.findFirstOrThrow({ where: { order_id: order.orderId } })
    const img = await asset()
    await prisma.product_images.create({ data: { organization_id: a.organizationId, product_id: item.product_id ?? "", asset_id: img.id, role: "GALLERY" } })
    // Ảnh chụp mẫu lúc khách chọn không có ảnh (mẫu tạo chưa có ảnh) → lấy ảnh trong kho
    const row = (await getCoordinatorBoard(a.ctx, {})).data.find((o) => o.id === order.orderId)
    expect(row?.product.imageUrl).toContain(img.storage_key)
  })

  it("mẫu chỉ có link Google Drive vẫn hiện ảnh xem trước trên bảng Điều phối", async () => {
    const order = await placeOrder()
    const item = await prisma.order_items.findFirstOrThrow({ where: { order_id: order.orderId } })
    await prisma.products.update({ where: { id: item.product_id ?? "" }, data: { attributes: { price: 500000, drive_link: "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWx" } } })
    const row = (await getCoordinatorBoard(a.ctx, {})).data.find((o) => o.id === order.orderId)
    expect(row?.product.imageUrl).toBe("/api/v1/public/drive-thumb-proxy?folder_id=1AbCdEfGhIjKlMnOpQrStUvWx")
  })
})
