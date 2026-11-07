import { prisma } from "@/core/tenancy/infra/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import { CHAIN_LINK_TYPES, recomputePrimaryLink } from "@/modules/organization/infra/organization-links"
import type { PartnershipStatus } from "../domain/partnership-entities"

export interface StoreSideLink {
  id: string
  chainOrgId: string
  chainName: string
  partnerCode: string
  status: PartnershipStatus
  validFrom: Date
}

/**
 * Liên kết chuỗi nhìn từ phía CỬA HÀNG con (audit hành trình C1, gói UJ-10). Mọi truy vấn lọc theo
 * `child_org_id` = tổ chức của phiên — cửa hàng chỉ thấy/đổi liên kết của chính mình; id của liên kết khác như
 * không tồn tại. Đổi trạng thái có điều kiện trạng thái cũ (hai người bấm cùng lúc chỉ một người thắng).
 */
export class ChainInvitationRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async listForStore(childOrgId: string, statuses: readonly PartnershipStatus[]): Promise<StoreSideLink[]> {
    const rows = await this.db.organization_links.findMany({
      where: { child_org_id: childOrgId, status: { in: [...statuses] }, link_type: { in: [...CHAIN_LINK_TYPES] } },
      orderBy: { valid_from: "desc" },
      select: { id: true, parent_org_id: true, partner_code: true, status: true, valid_from: true, parent_organization: { select: { name: true } } },
    })
    return rows.map((r) => ({
      id: r.id,
      chainOrgId: r.parent_org_id,
      chainName: r.parent_organization.name,
      partnerCode: r.partner_code,
      status: r.status,
      validFrom: r.valid_from,
    }))
  }

  async findForStore(childOrgId: string, linkId: string): Promise<StoreSideLink | null> {
    const rows = await this.listForStore(childOrgId, ["PENDING", "ACTIVE", "SUSPENDED", "TERMINATED"])
    return rows.find((r) => r.id === linkId) ?? null
  }

  /** `from` → `to` cho liên kết của cửa hàng; đặt lại cạnh chính trong cùng giao dịch. `false` = vừa bị đổi. */
  async transition(childOrgId: string, linkId: string, from: PartnershipStatus, to: PartnershipStatus, now: Date): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const res = await tx.organization_links.updateMany({
        where: { id: linkId, child_org_id: childOrgId, status: from },
        data: { status: to, ...(to === "TERMINATED" ? { valid_to: now } : {}), ...(to === "ACTIVE" ? { valid_from: now } : {}) },
      })
      if (res.count === 0) return false
      await recomputePrimaryLink(tx, childOrgId)
      return true
    })
  }
}
