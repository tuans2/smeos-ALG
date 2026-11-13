import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { ACTIVE_DISPATCH_STATUSES } from "./chain-dispatch-sweep-query"
import { dispatchBranchIdByCode } from "./dispatch-branch-lookup"
import { RECIPIENT_VIEW_SELECT, withDeliveryView } from "@/modules/orders/infra/order-recipient-view"

/** Trần số đơn trả về cho trang cửa hàng — danh sách luôn có giới hạn */
export const PORTAL_MAX_ORDERS = 100

/**
 * Dữ liệu trang cửa hàng nhận gia công. Mọi truy vấn đi qua tổ chức của `ctx`; chi nhánh của tài khoản
 * đọc từ `memberships.branch_id` (máy chủ, D-56), không bao giờ từ yêu cầu; chi nhánh nhận đơn là dòng `branches`
 * có `accepts_dispatch` (ADR-012 T-4c).
 */
export class BranchPortalRepository {
  constructor(private readonly db = prisma) {}

  /** Chi nhánh chuỗi gắn với tài khoản đang đăng nhập (null = chưa gắn) */
  async memberChainBranch(ctx: TenantContext): Promise<{ code: string; name: string } | null> {
    const membership = await this.db.memberships.findFirst({
      where: scopedWhere(ctx, { user_id: ctx.userId, status: "ACTIVE" as const }),
      select: { branch_id: true },
    })
    if (!membership?.branch_id) return null
    const branch = await this.db.branches.findFirst({
      where: { organization_id: ctx.organizationId, accepts_dispatch: true, id: membership.branch_id },
      select: { code: true, name: true, is_active: true },
    })
    return branch?.is_active ? { code: branch.code, name: branch.name } : null
  }

  async listChainBranches(ctx: TenantContext): Promise<Array<{ code: string; name: string }>> {
    const rows = await this.db.branches.findMany({
      where: scopedWhere(ctx, { accepts_dispatch: true }),
      select: { code: true, name: true },
      orderBy: [{ name: "asc" }, { code: "asc" }],
    })
    return rows.map((r) => ({ code: r.code, name: r.name }))
  }

  /**
   * Gắn / gỡ chi nhánh nhận đơn (theo mã) cho một thành viên → `memberships.branch_id` (D-56: thành viên bị giới hạn
   * theo chi nhánh, `branch-scope.ts`). Trả false nếu thành viên hoặc chi nhánh không thuộc tổ chức. Gỡ chỉ bỏ
   * `branch_id` khi nó đang trỏ một chi nhánh nhận đơn — chi nhánh thường gán ở nơi khác giữ nguyên.
   */
  async setMemberChainBranch(ctx: TenantContext, membershipId: string, code: string | null): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const member = await tx.memberships.findFirst({ where: scopedWhere(ctx, { id: membershipId }), select: { branch_id: true } })
      if (!member) return false
      let branchId = member.branch_id
      if (code) {
        const found = await dispatchBranchIdByCode(tx, ctx.organizationId, code)
        if (!found) return false
        branchId = found
      } else if (member.branch_id) {
        const current = await tx.branches.findFirst({ where: { id: member.branch_id, organization_id: ctx.organizationId }, select: { accepts_dispatch: true } })
        if (current?.accepts_dispatch) branchId = null
      }
      const updated = await tx.memberships.updateMany({ where: scopedWhere(ctx, { id: membershipId }), data: { branch_id: branchId } })
      return updated.count > 0
    })
  }

  /**
   * Phiên điều phối đang hoạt động mà chi nhánh được mời ở vòng hiện tại hoặc đang giữ đơn.
   * Lọc trong DB theo JSON (`invitedBranchIds` chứa mã / `claimedBranchId` = mã), mới cập nhật trước.
   */
  async listBranchDispatches(ctx: TenantContext, branchCode: string) {
    const rows = await this.db.order_coordinations.findMany({
      where: {
        organization_id: ctx.organizationId,
        AND: [
          {
            OR: ACTIVE_DISPATCH_STATUSES.map((status) => ({
              metadata: { path: ["subcontract_dispatch", "dispatchStatus"], equals: status },
            })),
          },
          {
            OR: [
              { metadata: { path: ["subcontract_dispatch", "invitedBranchIds"], array_contains: [branchCode] } },
              { metadata: { path: ["subcontract_dispatch", "claimedBranchId"], equals: branchCode } },
            ],
          },
        ],
        order: { status: { notIn: ["CANCELLED", "COMPLETED"] }, NOT: { delivery_status: "DELIVERED" } },
      },
      select: {
        metadata: true,
        updated_at: true,
        order: { select: { id: true, code: true, delivery_address: true, delivery_window: true, production_status: true, recipient: RECIPIENT_VIEW_SELECT } },
      },
      orderBy: { updated_at: "desc" },
      take: PORTAL_MAX_ORDERS,
    })
    return rows.map((r) => ({ ...r, order: withDeliveryView(r.order) })) // P-3b: người nhận từ order_recipients
  }
}
