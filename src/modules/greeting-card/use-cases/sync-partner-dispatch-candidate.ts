/**
 * sync-partner-dispatch-candidate.ts
 *
 * Cửa hàng đối tác có tài khoản ALG vào CHUNG vòng phân bổ theo khu vực với chi nhánh (PO 09/11/2026, P1 / D9):
 * mỗi liên kết chuỗi → cửa hàng có một dòng `branches` mang `partner_org_id`. Bộ máy bắn đơn, điểm chất lượng,
 * phạt huỷ, quyền xem đơn (`shared_order_access`) dùng nguyên như chi nhánh — không đổi thuật toán, không ưu tiên kênh.
 *
 * - Liên kết ACTIVE → tạo (lần đầu) hoặc bật lại nhận đơn.
 * - SUSPENDED / TERMINATED → tắt nhận đơn mới (D7); đơn đang làm vẫn hoàn tất được qua Thẻ Gia Công.
 * - TERMINATED mà cửa hàng còn giữ đơn → báo Điều phối chuỗi (đơn kẹt) để giao lại.
 */

export interface PartnerCandidateLink {
  partnerCode: string
  partnerName: string
  address: string | null
  province: string | null
  district: string | null
  capacityDaily: number
}

export interface PartnerCandidateStore {
  findLink(chainOrgId: string, partnerOrgId: string): Promise<PartnerCandidateLink | null>
  findCandidate(chainOrgId: string, partnerOrgId: string): Promise<{ code: string } | null>
  codeTaken(chainOrgId: string, code: string): Promise<boolean>
  createCandidate(chainOrgId: string, partnerOrgId: string, code: string, link: PartnerCandidateLink): Promise<void>
  setCandidateActive(chainOrgId: string, partnerOrgId: string, active: boolean, link: PartnerCandidateLink | null): Promise<void>
  heldOrderCodes(chainOrgId: string, branchCode: string): Promise<string[]>
}

export type PartnerLinkStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "TERMINATED"

export interface SyncPartnerCandidateResult {
  /** Mã ứng viên (`branches.code`) — null khi chưa từng tạo */
  code: string | null
  acceptsDispatch: boolean
  /** Đơn cửa hàng còn giữ lúc liên kết chấm dứt — đã báo Điều phối */
  heldOrderCodes: string[]
}

/** Mã ứng viên của cửa hàng đối tác: `DT-<mã đối tác>`; trùng mã chi nhánh có sẵn thì thêm hậu tố. */
export function partnerCandidateCode(partnerCode: string, partnerOrgId: string, taken: boolean): string {
  const base = `DT-${partnerCode.trim().toUpperCase().replace(/\s+/g, "-")}`
  return taken ? `${base}-${partnerOrgId.slice(0, 6).toUpperCase()}` : base
}

export async function syncPartnerDispatchCandidate(
  input: { chainOrgId: string; partnerOrgId: string; status: PartnerLinkStatus },
  deps: { store: PartnerCandidateStore; notifyStuck: (chainOrgId: string, message: string) => Promise<void> }
): Promise<SyncPartnerCandidateResult> {
  const { chainOrgId, partnerOrgId, status } = input
  const existing = await deps.store.findCandidate(chainOrgId, partnerOrgId)

  if (status === "ACTIVE") {
    const link = await deps.store.findLink(chainOrgId, partnerOrgId)
    if (!link) return { code: existing?.code ?? null, acceptsDispatch: false, heldOrderCodes: [] }
    if (existing) {
      await deps.store.setCandidateActive(chainOrgId, partnerOrgId, true, link)
      return { code: existing.code, acceptsDispatch: true, heldOrderCodes: [] }
    }
    const preferred = partnerCandidateCode(link.partnerCode, partnerOrgId, false)
    const code = (await deps.store.codeTaken(chainOrgId, preferred)) ? partnerCandidateCode(link.partnerCode, partnerOrgId, true) : preferred
    await deps.store.createCandidate(chainOrgId, partnerOrgId, code, link)
    return { code, acceptsDispatch: true, heldOrderCodes: [] }
  }

  if (!existing) return { code: null, acceptsDispatch: false, heldOrderCodes: [] }
  await deps.store.setCandidateActive(chainOrgId, partnerOrgId, false, null)
  const held = status === "TERMINATED" ? await deps.store.heldOrderCodes(chainOrgId, existing.code) : []
  if (held.length > 0) {
    await deps.notifyStuck(
      chainOrgId,
      `Liên kết với cửa hàng đối tác ${existing.code} đã chấm dứt khi còn giữ ${held.length} đơn (${held.slice(0, 10).map((c) => `#${c}`).join(", ")}). Vui lòng giao lại các đơn này.`
    )
  }
  return { code: existing.code, acceptsDispatch: false, heldOrderCodes: held }
}
