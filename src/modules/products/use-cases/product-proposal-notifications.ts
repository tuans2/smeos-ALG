import { runInBackground } from "@/core/runtime/background"
import type { TenantContext } from "@/core/tenancy"
import { notifyStaffEvent } from "@/modules/greeting-card/use-cases/notify-staff"

type Product = { name: string; code: string }

/**
 * Thông báo quanh mẫu đề xuất — đi qua ma trận thông báo nhân viên sẵn có
 * (Hộp việc + kênh tiệm đã bật). Chạy nền: thông báo lỗi không được chặn thao
 * tác chính (`notifyStaffEvent` vốn không ném lỗi).
 */
export function notifyProductProposed(ctx: TenantContext, product: Product) {
  runInBackground("products.notify_proposed", () =>
    notifyStaffEvent(ctx.organizationId, "PRODUCT_PROPOSED", { productName: product.name, extraNote: `Mã ${product.code}` })
  )
}

export function notifyProposalReminder(organizationId: string, product: Product, daysLeft: number) {
  return notifyStaffEvent(organizationId, "PRODUCT_PROPOSAL_REMINDER", {
    productName: product.name,
    extraNote: `Mã ${product.code} · còn ${daysLeft} ngày`,
  })
}

/** Báo riêng người đề xuất — `assignedSaleId` là người nhận, bất kể vai. */
export function notifyProposer(
  organizationId: string,
  event: "PRODUCT_PROPOSAL_REJECTED" | "PRODUCT_PROPOSAL_EXPIRED" | "PRODUCT_CHANGE_REVIEWED",
  proposerId: string,
  product: Product,
  reason?: string
) {
  return notifyStaffEvent(organizationId, event, {
    productName: product.name,
    assignedSaleId: proposerId,
    extraNote: reason ? `Mã ${product.code} · ${reason}` : `Mã ${product.code}`,
  })
}

export function notifyChangeRequested(ctx: TenantContext, product: Product) {
  runInBackground("products.notify_change_requested", () =>
    notifyStaffEvent(ctx.organizationId, "PRODUCT_CHANGE_REQUESTED", { productName: product.name, extraNote: `Mã ${product.code}` })
  )
}
