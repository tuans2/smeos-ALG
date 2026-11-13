/**
 * ADR-014 D-P6, bước P-4 (PO duyệt 07/11/2026): quyền xem đơn của chi nhánh nhận gia công suy từ phiên điều phối,
 * và dòng "Giao tại" của tin mời chỉ ghi khu vực. Pure TypeScript.
 */
import type { AdministrativeArea } from "./area-match"
import type { SubcontractOrderState } from "./subcontract-order"

export type SubcontractShareLevel = "INVITED" | "ASSIGNED"

/**
 * Chi nhánh nào đang được xem đơn, ở mức nào: phiên đang mở → chi nhánh được mời ở vòng hiện tại (trừ chi nhánh đã
 * từ chối); đã có chi nhánh giữ/chốt → chỉ chi nhánh đó. Hết vòng, chuyển Điều phối, huỷ → không ai.
 */
export function subcontractShares(state: SubcontractOrderState | null | undefined): Map<string, SubcontractShareLevel> {
  const out = new Map<string, SubcontractShareLevel>()
  if (!state) return out
  if ((state.dispatchStatus === "CLAIMED_GRACE" || state.dispatchStatus === "COMMITTED") && state.claimedBranchId) {
    out.set(state.claimedBranchId, "ASSIGNED")
    return out
  }
  if (state.dispatchStatus === "OPEN") {
    const declined = new Set(state.declinedBranchIds ?? [])
    for (const b of state.invitedBranchIds ?? []) if (!declined.has(b)) out.set(b, "INVITED")
  }
  return out
}

export const SUBCONTRACT_AREA_FALLBACK = "xem địa chỉ trong Thẻ Gia Công"

/** "Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh" — tin mời trên Telegram/Zalo không chứa số nhà, tên đường, người nhận. */
export function subcontractAreaText(area: AdministrativeArea | null | undefined): string {
  const parts = [area?.ward, area?.district, area?.province].map((s) => s?.trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : SUBCONTRACT_AREA_FALLBACK
}
