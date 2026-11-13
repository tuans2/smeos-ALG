import { prisma } from "@/core/tenancy/infra/prisma"
import { CUSTOMER_PHOTO_FEEDBACK } from "../domain/photo-approval"

export const CUSTOMER_PHOTO_APPROVED = "CUSTOMER_PHOTO_APPROVED"

/**
 * Ghi khách xác nhận ảnh thành phẩm (Spec #3) — luồng công khai, không có phiên đăng nhập:
 * `organization_id` lấy từ chính đơn đã được use-case xác minh chủ phiên.
 * Idempotent: bấm lại không tạo bản ghi trùng.
 */
export class PhotoApprovalRepository {
  constructor(private readonly db = prisma) {}

  /** `actorId`: Điều phối duyệt thay khách; khách tự duyệt thì để trống. */
  async recordApproval(order: { id: string; organization_id: string; production_status: string }, actorId: string | null = null) {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.order_qc_records.findFirst({
        where: { organization_id: order.organization_id, order_id: order.id, notes: CUSTOMER_PHOTO_APPROVED },
        select: { id: true },
      })
      if (existing) return { created: false }

      await tx.order_qc_records.create({
        data: {
          organization_id: order.organization_id,
          order_id: order.id,
          status: "PASSED",
          notes: CUSTOMER_PHOTO_APPROVED,
          inspector_id: actorId,
        },
      })
      await tx.order_events.create({
        data: {
          organization_id: order.organization_id,
          order_id: order.id,
          axis: "production",
          from_value: order.production_status,
          to_value: "CUSTOMER_APPROVED",
          reason: CUSTOMER_PHOTO_APPROVED,
          actor_id: actorId,
        },
      })
      return { created: true }
    })
  }

  /**
   * Khách góp ý ảnh thành phẩm (checklist ALG 5.13): một giao dịch ghi QC `CUSTOMER_PHOTO_FEEDBACK`
   * (`REWORK_REQUESTED`, lời góp ý trong `checklist_result`), sự kiện sản xuất và dòng ghi chú nội bộ.
   */
  async recordFeedback(order: { id: string; organization_id: string; production_status: string }, message: string) {
    await this.db.$transaction(async (tx) => {
      await tx.order_qc_records.create({
        data: {
          organization_id: order.organization_id,
          order_id: order.id,
          status: "REWORK_REQUESTED",
          notes: CUSTOMER_PHOTO_FEEDBACK,
          checklist_result: { customerFeedback: message },
        },
      })
      await tx.order_events.create({
        data: {
          organization_id: order.organization_id,
          order_id: order.id,
          axis: "production",
          from_value: order.production_status,
          to_value: order.production_status,
          reason: `${CUSTOMER_PHOTO_FEEDBACK}: ${message}`,
        },
      })
      const current = await tx.orders.findFirst({ where: { id: order.id, organization_id: order.organization_id }, select: { internal_note: true } })
      await tx.orders.updateMany({
        where: { id: order.id, organization_id: order.organization_id },
        data: { internal_note: [current?.internal_note, `[Khách góp ý ảnh] ${message}`].filter(Boolean).join("\n") },
      })
    })
  }
}

let _photoApprovalRepositorySingleton: PhotoApprovalRepository | null = null
export function getPhotoApprovalRepository(): PhotoApprovalRepository {
  if (!_photoApprovalRepositorySingleton) _photoApprovalRepositorySingleton = new PhotoApprovalRepository()
  return _photoApprovalRepositorySingleton
}
