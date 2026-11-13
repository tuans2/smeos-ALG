/**
 * notify-shipper-request.ts
 *
 * Gửi yêu cầu chi nhánh cung cấp thông tin shipper ngay sau khi ảnh thành phẩm đạt (READY), kèm
 * link đã ký để điền tên + SĐT shipper. Nhắc lại do cron mốc M3 đảm nhận — trước 22/10/2026 có
 * thêm một hẹn giờ 30 phút trong tiến trình web (mất khi khởi động lại, gửi trùng với M3), và kênh
 * liên lạc đọc nhầm chỗ nên yêu cầu không bao giờ tới chi nhánh (rà soát cụm G).
 */

import { publicAppUrl } from "@/lib/public-url"
import { log } from "@/core/observability/log"
import type { TenantContext } from "@/core/tenancy"
import { SubcontractStepStore } from "@/modules/greeting-card/infra/subcontract-step-store"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import { subcontractBranchUrl } from "@/modules/greeting-card/infra/subcontract-link-token"
import { MultiChannelDispatchNotifier } from "../infra/dispatch-notification-adapter"
import { buildDispatchTitle } from "../domain/dispatch-message-titles"

export interface ShipperRequestInput {
  organizationId: string
  orderId: string
  orderCode: string
  branchId: string
}

export async function notifyShipperRequest(input: ShipperRequestInput): Promise<{ sent: boolean }> {
  const { organizationId, orderId, orderCode, branchId } = input
  const branch = await new ChainBranchRepository().findByCode(organizationId, branchId)
  if (!branch) {
    log.warn("shipper_request.branch_not_found", { orderId, orderCode, branchId })
    return { sent: false }
  }

  const submitUrl = subcontractBranchUrl({ baseUrl: publicAppUrl(), organizationId, orderCode, branchId, action: "submit_shipper" })
  const messageText =
    `🚀 Đơn hàng #${orderCode} đã xác nhận ảnh thành phẩm.\n\n` +
    `Vui lòng cung cấp thông tin shipper để bàn giao đơn: tên và số điện thoại tài xế.\n` +
    `Hệ thống sẽ nhắc lại nếu chưa nhận được thông tin.`
  const ctx: TenantContext = { organizationId, workspaceId: organizationId, userId: "system", branchId: null, capabilities: new Set() }

  const result = await new MultiChannelDispatchNotifier()
    .sendSubcontractInvite(ctx, {
      branch,
      orderCode,
      messageText,
      claimUrl: submitUrl,
      title: buildDispatchTitle({ emoji: "📦", action: "Cần thông tin shipper", level: "normal", orderCode }),
      actions: [{ text: "Nhập thông tin shipper ngay", url: submitUrl }],
    })
    .catch(() => ({ sent: false }))

  if (result.sent) {
    await new SubcontractStepStore().mutateMetadata(organizationId, orderId, (current) => ({
      next: { ...current, shipper_request_sent_at: new Date().toISOString() },
      result: undefined,
    }))
  }
  log.info(result.sent ? "shipper_request.sent" : "shipper_request.not_delivered", { orderId, orderCode, branchId })
  return { sent: result.sent }
}
