/**
 * branch-portal.ts
 *
 * Trang cửa hàng nhận gia công (/cua-hang): đơn đang mời chi nhánh và đơn chi nhánh đang làm.
 * Đọc thẳng trạng thái điều phối (`order_coordinations.metadata.subcontract_dispatch`) nên luôn khớp
 * với thẻ Telegram / Zalo — không có bản sao "hộp thư" nào để lệch. Thao tác nhận / huỷ / chụp ảnh
 * dùng Thẻ Gia Công hiện có qua link đã ký cho đúng chi nhánh.
 */

import type { TenantContext } from "@/core/tenancy"
import type { SubcontractOrderState } from "../domain/subcontract-order"
import { formatDeliveryAddress } from "../domain/delivery-address"
import { subcontractBranchUrl } from "@/modules/greeting-card/infra/subcontract-link-token"

export type PortalOrderStage = "INVITED" | "GRACE" | "IN_PROGRESS"

export interface PortalOrder {
  orderCode: string
  stage: PortalOrderStage
  deliveryAddress: string
  deliveryTime: string
  subcontractPriceVnd: number | null
  /** Hạn nhận đơn (INVITED) hoặc hạn huỷ nhận (GRACE) */
  deadlineAt: string | null
  productionStatus: string | null
  cardUrl: string
}

export interface PortalDispatchRow {
  metadata: unknown
  order: { code: string; delivery_address: unknown; delivery_window: unknown; production_status: string | null }
}

export interface IBranchPortalStore {
  memberChainBranch(ctx: TenantContext): Promise<{ code: string; name: string } | null>
  listBranchDispatches(ctx: TenantContext, branchCode: string): Promise<PortalDispatchRow[]>
}

function deliveryTimeOf(window: unknown): string {
  const w = (window as Record<string, unknown> | null) ?? {}
  return typeof w.timeSlot === "string" && typeof w.date === "string" ? `${w.timeSlot} ngày ${w.date}` : "Giao trong ngày"
}

/** Phân loại một phiên điều phối theo góc nhìn của chi nhánh; null = chi nhánh không còn việc ở đơn này */
export function classifyForBranch(state: SubcontractOrderState, branchCode: string, now: Date): { stage: PortalOrderStage; deadlineAt: string | null } | null {
  if (state.claimedBranchId === branchCode) {
    if (state.dispatchStatus === "CLAIMED_GRACE") return { stage: "GRACE", deadlineAt: state.graceExpiresAt }
    if (state.dispatchStatus === "COMMITTED") return { stage: "IN_PROGRESS", deadlineAt: null }
    return null
  }
  const invited = (state.invitedBranchIds ?? []).includes(branchCode)
  const declined = (state.declinedBranchIds ?? []).includes(branchCode)
  const expired = state.roundExpiresAt !== null && new Date(state.roundExpiresAt).getTime() <= now.getTime()
  if (state.dispatchStatus === "OPEN" && invited && !declined && !expired) {
    return { stage: "INVITED", deadlineAt: state.roundExpiresAt }
  }
  return null
}

const STAGE_ORDER: Record<PortalOrderStage, number> = { INVITED: 0, GRACE: 1, IN_PROGRESS: 2 }

export async function listBranchPortalOrders(
  ctx: TenantContext,
  store: IBranchPortalStore,
  baseUrl: string,
  now = new Date()
): Promise<{ branch: { code: string; name: string } | null; orders: PortalOrder[] }> {
  const branch = await store.memberChainBranch(ctx)
  if (!branch) return { branch: null, orders: [] }

  const rows = await store.listBranchDispatches(ctx, branch.code)
  const orders: PortalOrder[] = []
  for (const row of rows) {
    const state = (row.metadata as Record<string, unknown> | null)?.subcontract_dispatch as SubcontractOrderState | undefined
    if (!state) continue
    const view = classifyForBranch(state, branch.code, now)
    if (!view) continue
    orders.push({
      orderCode: row.order.code,
      stage: view.stage,
      deliveryAddress: formatDeliveryAddress(row.order.delivery_address),
      deliveryTime: deliveryTimeOf(row.order.delivery_window),
      subcontractPriceVnd: state.subcontractPriceVnd ?? null,
      deadlineAt: view.deadlineAt,
      productionStatus: row.order.production_status,
      cardUrl: subcontractBranchUrl({ baseUrl, organizationId: ctx.organizationId, orderCode: row.order.code, branchId: branch.code }),
    })
  }
  orders.sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage])
  return { branch, orders }
}
