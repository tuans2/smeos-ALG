/**
 * POST /api/v1/coordinator/orders/[id]/approve-customer-photo
 *
 * Điều phối duyệt ảnh thành phẩm thay khách (khách báo qua điện thoại, Zalo…). Ghi cùng bản ghi
 * với khách tự duyệt trên trang theo dõi (`CUSTOMER_PHOTO_APPROVED`), nên bước giao mở ngay —
 * trước 22/10/2026 nút này ghi vào metadata riêng mà không bước nào đọc (rà soát cụm G).
 */

import { jsonResponse } from "@/core/http/response"
import { conflict, notFound } from "@/core/http/errors"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"
import { PhotoApprovalRepository } from "@/modules/greeting-card/infra/photo-approval-repository"
import { log } from "@/core/observability/log"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ ctx, params }) => {
    const { id: orderId } = params as { id: string }

    const repo = new SubcontractOrderRepository()
    const order = await repo.findSubcontractById(orderId, ctx.organizationId)
    if (!order) throw notFound()
    if (order.status === "CANCELLED") throw conflict("Đơn hàng đã bị hủy")
    const facts = await repo.loadPhotoApprovalFacts(ctx.organizationId, order.id)
    if (!facts?.qc_records.some((qc) => qc.notes === "PRODUCT_PHOTO_UPLOADED")) throw conflict("Chưa có ảnh thành phẩm để duyệt")

    const { created } = await new PhotoApprovalRepository().recordApproval(order, ctx.userId)
    if (created) log.info("coordinator.approve_customer_photo", { orderId: order.id, orderCode: order.code, actorId: ctx.userId })

    return jsonResponse({
      data: {
        success: true,
        alreadyApproved: !created,
        message: created ? "Đã duyệt ảnh thành phẩm thay khách. Đơn được chuyển sang bước giao." : "Ảnh thành phẩm đã được duyệt trước đó.",
      },
    })
  },
})

export const dynamic = "force-dynamic"
