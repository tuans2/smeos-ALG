import { prisma } from "@/core/tenancy/infra/prisma"
import { CHAIN_LINK_TYPES } from "@/modules/organization/infra/organization-links"
import type { PartnerCandidateLink, PartnerCandidateStore } from "../use-cases/sync-partner-dispatch-candidate"

/**
 * Dòng `branches` của chuỗi đại diện cho một cửa hàng đối tác (`partner_org_id`, PO duyệt D9) — để bộ máy bắn đơn
 * xếp cửa hàng đối tác chung vòng với chi nhánh mà không cần sửa thuật toán. Chuỗi chỉnh toạ độ / phường lân cận /
 * sức chứa ở màn chi nhánh như mọi chi nhánh; đồng bộ không ghi đè các trường đó.
 */
export class PartnerDispatchCandidateRepository implements PartnerCandidateStore {
  constructor(private readonly db = prisma) {}

  async findLink(chainOrgId: string, partnerOrgId: string): Promise<PartnerCandidateLink | null> {
    const row = await this.db.organization_links.findUnique({
      where: { parent_org_id_child_org_id: { parent_org_id: chainOrgId, child_org_id: partnerOrgId } },
      select: { partner_code: true, address: true, province: true, district: true, capacity_daily: true, link_type: true, child_organization: { select: { name: true } } },
    })
    if (!row || !(CHAIN_LINK_TYPES as readonly string[]).includes(row.link_type)) return null
    return {
      partnerCode: row.partner_code,
      partnerName: row.child_organization.name,
      address: row.address,
      province: row.province,
      district: row.district,
      capacityDaily: row.capacity_daily,
    }
  }

  async findCandidate(chainOrgId: string, partnerOrgId: string): Promise<{ code: string } | null> {
    return this.db.branches.findFirst({ where: { organization_id: chainOrgId, partner_org_id: partnerOrgId }, select: { code: true } })
  }

  async codeTaken(chainOrgId: string, code: string): Promise<boolean> {
    return (await this.db.branches.count({ where: { organization_id: chainOrgId, code } })) > 0
  }

  async createCandidate(chainOrgId: string, partnerOrgId: string, code: string, link: PartnerCandidateLink): Promise<void> {
    await this.db.branches.create({
      data: {
        organization_id: chainOrgId,
        partner_org_id: partnerOrgId,
        code,
        name: link.partnerName,
        address: link.address,
        province: link.province,
        district: link.district,
        max_concurrent_jobs: Math.max(1, link.capacityDaily),
        accepts_dispatch: true,
        is_active: true,
      },
    })
  }

  async setCandidateActive(chainOrgId: string, partnerOrgId: string, active: boolean, link: PartnerCandidateLink | null): Promise<void> {
    await this.db.branches.updateMany({
      where: { organization_id: chainOrgId, partner_org_id: partnerOrgId },
      // Tên cửa hàng do cửa hàng sở hữu — luôn theo tên hiện tại; khu vực / sức chứa chuỗi đã chỉnh thì giữ
      data: { accepts_dispatch: active, ...(active ? { is_active: true } : {}), ...(link ? { name: link.partnerName } : {}) },
    })
  }

  /** Mã đơn chuỗi đang để cửa hàng này giữ (đã nhận / đang làm) — để báo Điều phối khi liên kết chấm dứt. */
  async heldOrderCodes(chainOrgId: string, branchCode: string): Promise<string[]> {
    const rows = await this.db.order_coordinations.findMany({
      where: {
        organization_id: chainOrgId,
        metadata: { path: ["subcontract_dispatch", "claimedBranchId"], equals: branchCode },
        AND: [{ OR: ["CLAIMED_GRACE", "COMMITTED"].map((status) => ({ metadata: { path: ["subcontract_dispatch", "dispatchStatus"], equals: status } })) }],
      },
      select: { order: { select: { code: true, status: true } } },
      take: 100,
    })
    return rows.filter((r) => r.order.status !== "CANCELLED" && r.order.status !== "COMPLETED").map((r) => r.order.code)
  }
}
