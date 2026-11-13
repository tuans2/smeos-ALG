import type { PrismaClient } from "@/generated/prisma/client"
import { prisma as defaultPrisma } from "@/core/tenancy/infra/prisma"

/** Trần số cửa hàng đối tác đọc một lần — danh sách luôn có giới hạn. */
const MAX_PARTNERS = 200
const HOLDING = ["CLAIMED_GRACE", "COMMITTED"] as const

/**
 * Số liệu đơn gia công của chuỗi theo cửa hàng đối tác (kế hoạch chat nội bộ IC-5.5, IC-6.3). Đọc thẳng trạng thái
 * điều phối (`order_coordinations.metadata.subcontract_dispatch`) và dòng ứng viên `branches.partner_org_id` — chỉ
 * trong tổ chức chuỗi của người xem, chỉ đếm, không đọc dữ liệu khách.
 */
export class PrismaPartnerOrderStats {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  private async partnerCodes(chainOrgId: string, partnerOrgIds?: string[]): Promise<Map<string, string>> {
    const rows = await this.prisma.branches.findMany({
      where: { organization_id: chainOrgId, partner_org_id: partnerOrgIds ? { in: partnerOrgIds } : { not: null } },
      select: { code: true, partner_org_id: true },
      take: MAX_PARTNERS,
    })
    return new Map(rows.filter((r) => r.partner_org_id).map((r) => [r.code, r.partner_org_id!]))
  }

  /** Đơn cửa hàng đang giữ (đã nhận / đang làm, chưa xong, chưa huỷ) theo từng cửa hàng đối tác. */
  async activeOrdersByPartner(chainOrgId: string, partnerOrgIds: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>()
    if (partnerOrgIds.length === 0) return out
    const codes = await this.partnerCodes(chainOrgId, partnerOrgIds)
    if (codes.size === 0) return out
    const rows = await this.prisma.order_coordinations.findMany({
      where: {
        organization_id: chainOrgId,
        order: { status: { notIn: ["CANCELLED", "COMPLETED"] }, delivery_status: { not: "DELIVERED" } },
        AND: [
          { OR: [...codes.keys()].map((code) => ({ metadata: { path: ["subcontract_dispatch", "claimedBranchId"], equals: code } })) },
          { OR: HOLDING.map((status) => ({ metadata: { path: ["subcontract_dispatch", "dispatchStatus"], equals: status } })) },
        ],
      },
      select: { metadata: true },
      take: 1000,
    })
    for (const r of rows) {
      const code = ((r.metadata as Record<string, unknown> | null)?.subcontract_dispatch as { claimedBranchId?: string } | undefined)?.claimedBranchId
      const partner = code ? codes.get(code) : undefined
      if (partner) out.set(partner, (out.get(partner) ?? 0) + 1)
    }
    return out
  }

  /** 30 ngày (hoặc từ `since`): số lời mời đăng vào Trao đổi nội bộ và số đơn cửa hàng đối tác đã nhận. */
  async chatDispatchStats(chainOrgId: string, since: Date): Promise<{ invitesInChat: number; partnerClaims: number; partnerStores: number }> {
    const codes = await this.partnerCodes(chainOrgId)
    const [invitesInChat, partnerClaims] = await Promise.all([
      this.prisma.internal_chat_messages.count({ where: { organization_id: chainOrgId, message_type: "ACTION_CARD_SUBCONTRACT", created_at: { gte: since } } }),
      codes.size === 0
        ? Promise.resolve(0)
        : this.prisma.order_coordinations.count({
            where: {
              organization_id: chainOrgId,
              updated_at: { gte: since },
              OR: [...codes.keys()].map((code) => ({ metadata: { path: ["subcontract_dispatch", "claimedBranchId"], equals: code } })),
            },
          }),
    ])
    return { invitesInChat, partnerClaims, partnerStores: new Set(codes.values()).size }
  }
}
