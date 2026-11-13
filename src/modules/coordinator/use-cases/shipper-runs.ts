/**
 * "Đơn cần giao" của Shipper (checklist ALG 4.5, R18): chỉ đơn đang giao mà Điều phối gắn đúng số
 * điện thoại của người đăng nhập; chỉ người nhận, SĐT, địa chỉ, khung giờ, lời thiệp. Đơn không gắn
 * cho mình → 404 như không tồn tại. Cập nhật giao đi qua cùng luật với Điều phối (ảnh giao bắt buộc).
 */

import { AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { DeliveryEvent } from "../domain/operation-rules"
import { isSameShipper } from "../domain/shipper-match"
import { ShipperRunRepository } from "../infra/shipper-run-repository"
import { recordDeliveryUpdate } from "./record-delivery-update"

export interface ShipperRunView {
  orderId: string
  code: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: unknown
  deliveryTimeSlot: string | null
  deliveryTargetAt: string | null
  cardMessage: string | null
  deliveryState: string | null
}

export interface ShipperRuns {
  /** Tài khoản chưa có số điện thoại → không gắn được đơn nào; màn nhắc liên hệ Điều hành. */
  phoneMissing: boolean
  runs: ShipperRunView[]
}

const str = (meta: Record<string, unknown>, key: string) => (typeof meta[key] === "string" ? (meta[key] as string) : "")

export async function listShipperRuns(ctx: TenantContext, repo = new ShipperRunRepository()): Promise<ShipperRuns> {
  const me = await repo.currentUser(ctx)
  if (!me.phone) return { phoneMissing: true, runs: [] }
  const rows = (await repo.dispatching(ctx)).filter((c) => isSameShipper(c.shipper_phone, me.phone))
  return {
    phoneMissing: false,
    runs: rows.map((c) => {
      const meta = (c.metadata ?? {}) as Record<string, unknown>
      const window = (c.order.delivery_window ?? {}) as { timeSlot?: string }
      return {
        orderId: c.order.id,
        code: c.order.code,
        recipientName: str(meta, "recipientName"),
        recipientPhone: str(meta, "recipientPhone"),
        deliveryAddress: c.order.delivery_address,
        deliveryTimeSlot: window.timeSlot ?? null,
        deliveryTargetAt: c.estimated_delivery_at?.toISOString() ?? null,
        cardMessage: c.order.card_message,
        deliveryState: c.delivery_state,
      }
    }),
  }
}

export interface ShipperUpdateInput {
  event: DeliveryEvent
  podAssetId?: string | undefined
  recipientSignedName?: string | undefined
  failureReason?: string | undefined
}

export async function reportShipperRun(
  ctx: TenantContext,
  orderId: string,
  input: ShipperUpdateInput,
  repo = new ShipperRunRepository(),
  record: typeof recordDeliveryUpdate = recordDeliveryUpdate
): Promise<{ deliveryState: string | null }> {
  const { runs } = await listShipperRuns(ctx, repo)
  if (!runs.some((r) => r.orderId === orderId)) throw new AppError("NOT_FOUND", "Không tìm thấy đơn này trong danh sách giao của bạn.")
  const me = await repo.currentUser(ctx)
  const view = await record(ctx, orderId, { ...input, shipperName: me.name, shipperPhone: me.phone ?? undefined })
  return { deliveryState: view.delivery?.state ?? null }
}
