/**
 * subcontract-order-repository.ts
 *
 * Repository lưu trữ và đồng bộ trạng thái Thẻ Gia Công (Subcontract Order).
 * Triển khai ISubcontractStateStore theo chuẩn Clean Architecture & Tenant Isolation.
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import type { Prisma } from "@/generated/prisma/client"
import { withIndustryKey, withOrganizationIndustry } from "@/modules/organization/domain/industry-key"
import { ORG_SETTINGS_SELECT } from "@/modules/organization/infra/organization-industry"
import type { SubcontractOrderState } from "../domain/subcontract-order"
import { subcontractShares } from "../domain/subcontract-share"
import { hasActiveOrderShare, syncOrderShares } from "@/modules/orders/infra/shared-order-access-repository"
import type { ISubcontractClaimStore } from "../use-cases/dispatch-subcontract-order"
import type { DeliveryGeoEntry, IDeliveryGeoStore } from "../use-cases/resolve-geo-location"
import { queueOrderNotification } from "../use-cases/notify-customer"

export class SubcontractOrderRepository implements ISubcontractClaimStore, IDeliveryGeoStore {
  constructor(
    private readonly db = prisma,
    /** Chi nhánh chốt làm → báo khách "Đã nhận đơn" (PO 22/10/2026: không báo lúc Điều phối xác nhận tiền) */
    private readonly onOrderAccepted: (organizationId: string, orderId: string) => void = (orgId, orderId) =>
      queueOrderNotification(orgId, orderId, "ORDER_ACCEPTED")
  ) {}

  async loadSubcontractState(ctx: TenantContext, orderId: string): Promise<SubcontractOrderState | null> {
    const coordination = await this.db.order_coordinations.findFirst({
      where: scopedWhere(ctx, { order_id: orderId }),
      select: { metadata: true },
    })

    if (!coordination?.metadata || typeof coordination.metadata !== "object") return null
    const meta = coordination.metadata as Record<string, unknown>
    const sub = meta.subcontract_dispatch
    if (!sub || typeof sub !== "object") return null
    return sub as SubcontractOrderState
  }

  /** Ghi đè cả phiên gia công. Chỉ dùng khi KHÔNG phụ thuộc trạng thái cũ; còn lại dùng `updateSubcontractState`. */
  async saveSubcontractState(ctx: TenantContext, state: SubcontractOrderState): Promise<void> {
    await this.updateSubcontractState(ctx, state.orderId, () => ({ next: state, result: undefined }))
  }

  /**
   * Đọc–sửa–ghi phiên gia công dưới khoá dòng `order_coordinations` (SELECT … FOR UPDATE), cùng
   * giao dịch với các thay đổi kèm theo trên `orders`. `change` nhận trạng thái MỚI NHẤT; trả
   * `next: null` để không ghi gì; ném lỗi để huỷ cả giao dịch.
   *
   * Trước 22/10/2026 mọi nơi đọc trạng thái, kiểm tra trong bộ nhớ rồi ghi đè cả khối JSON: hai
   * chi nhánh bấm nhận cùng lúc đều thắng, cron ghi đè thao tác chốt/huỷ vừa xảy ra (rà soát cụm G).
   */
  async updateSubcontractState<T>(
    ctx: TenantContext,
    orderId: string,
    change: (current: SubcontractOrderState | null) => { next: SubcontractOrderState | null; result: T }
  ): Promise<T> {
    let accepted = false
    const out = await this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; metadata: unknown }>>`
        SELECT "id", "metadata" FROM "order_coordinations"
        WHERE "organization_id" = ${ctx.organizationId} AND "order_id" = ${orderId}
        FOR UPDATE`
      const row = rows[0]
      const meta = row?.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {}
      const sub = meta.subcontract_dispatch
      const current = sub && typeof sub === "object" ? (sub as SubcontractOrderState) : null

      const { next, result } = change(current)
      if (!next) return result

      const newMeta = { ...meta, subcontract_dispatch: next } as unknown as Prisma.InputJsonValue
      if (row) {
        await tx.order_coordinations.update({ where: { id: row.id }, data: { metadata: newMeta } })
      } else {
        await tx.order_coordinations.create({
          data: { id: `coord_${orderId}`, organization_id: ctx.organizationId, order_id: orderId, metadata: newMeta },
        })
      }
      accepted = await this.syncOrderWithDispatch(tx, ctx, next)
      await syncOrderShares(tx, ctx.organizationId, orderId, subcontractShares(next)) // P-4: quyền xem theo phiên
      return result
    })
    // Gửi sau khi giao dịch đã ghi — giao dịch huỷ thì không báo khách
    if (accepted) this.onOrderAccepted(ctx.organizationId, orderId)
    return out
  }

  /** Ghi trạng thái chỉ khi trạng thái hiện tại (dưới khoá dòng) còn là `expectedStatus`. */
  /** P-4: chi nhánh `branchKey` còn được xem đơn (Thẻ Gia Công) — quyền chưa thu hồi, chưa quá hạn sau khi đơn đóng. */
  async hasBranchShare(organizationId: string, orderId: string, branchKey: string, now = new Date()): Promise<boolean> {
    return hasActiveOrderShare(this.db, organizationId, orderId, branchKey, now)
  }

  /** P-4: cấp/thu quyền xem theo phiên điều phối đang lưu (dữ liệu dựng sẵn, công cụ vận hành). */
  async syncSharesFromState(ctx: TenantContext, orderId: string): Promise<void> {
    await syncOrderShares(this.db, ctx.organizationId, orderId, subcontractShares(await this.loadSubcontractState(ctx, orderId)))
  }


  async loadDeliveryGeo(ctx: TenantContext, orderId: string): Promise<DeliveryGeoEntry | null> {
    const coordination = await this.db.order_coordinations.findFirst({
      where: scopedWhere(ctx, { order_id: orderId }),
      select: { metadata: true },
    })
    const geo = (coordination?.metadata as Record<string, unknown> | null)?.delivery_geo
    return geo && typeof geo === "object" ? (geo as DeliveryGeoEntry) : null
  }

  /**
   * Ghi đệm toạ độ vào phiên điều phối có sẵn (không tạo phiên mới — phiên do luồng tạo đơn tạo).
   * `jsonb_set` trong một câu lệnh: không đè `subcontract_dispatch` đang được ghi song song.
   */
  async saveDeliveryGeo(ctx: TenantContext, orderId: string, entry: DeliveryGeoEntry): Promise<void> {
    await this.db.$executeRaw`
      UPDATE "order_coordinations"
      SET "metadata" = jsonb_set(COALESCE("metadata", '{}'::jsonb), '{delivery_geo}', ${JSON.stringify(entry)}::jsonb, true)
      WHERE "organization_id" = ${ctx.organizationId} AND "order_id" = ${orderId}`
  }

  async saveSubcontractStateIfStatus(
    ctx: TenantContext,
    state: SubcontractOrderState,
    expectedStatus: SubcontractOrderState["dispatchStatus"]
  ): Promise<boolean> {
    return this.updateSubcontractState(ctx, state.orderId, (current) =>
      current?.dispatchStatus === expectedStatus ? { next: state, result: true } : { next: null, result: false }
    )
  }

  /**
   * `orders.branch_id` theo chi nhánh đang giữ đơn, và tự xác nhận đơn khi chi nhánh chốt làm. `claimedBranchId` là
   * `branches.id` hoặc mã chi nhánh điều phối (`branches.code` có `accepts_dispatch`, ADR-012 T-4a).
   */
  private async syncOrderWithDispatch(tx: Prisma.TransactionClient, ctx: TenantContext, state: SubcontractOrderState): Promise<boolean> {
    const claimed = state.claimedBranchId
    const realBranch = claimed
      ? await tx.branches.findFirst({
          where: { organization_id: ctx.organizationId, OR: [{ id: claimed }, { code: claimed, accepts_dispatch: true }] },
          select: { id: true },
        })
      : null
    if (realBranch && (state.dispatchStatus === "CLAIMED_GRACE" || state.dispatchStatus === "COMMITTED")) {
      await tx.orders.updateMany({ where: scopedWhere(ctx, { id: state.orderId }), data: { branch_id: realBranch.id } })
    } else if (state.dispatchStatus === "OPEN") {
      await tx.orders.updateMany({ where: scopedWhere(ctx, { id: state.orderId }), data: { branch_id: null } })
    }

    // Tự xác nhận đơn khi chi nhánh chốt làm (mặc định bật, tắt bằng auto_confirm_on_branch_commit=false)
    if (state.dispatchStatus !== "COMMITTED") return false
    const org = await tx.organizations.findUnique({ where: { id: ctx.organizationId }, select: { settings: true } })
    const rawPolicy = ((org?.settings as Record<string, unknown> | null) ?? {})["chain_dispatch_policy"] as Record<string, unknown> | undefined
    if (rawPolicy?.auto_confirm_on_branch_commit === false || rawPolicy?.autoConfirmOnBranchCommit === false) return false
    const moved = await tx.orders.updateMany({
      where: scopedWhere(ctx, { id: state.orderId, NOT: { status: "CANCELLED" as const }, production_status: "WAITING" as const }),
      data: { status: "CONFIRMED" as const, production_status: "ASSIGNED" as const },
    })
    // Chỉ lần chuyển WAITING → ASSIGNED đầu tiên mới là "đơn được nhận"
    return moved.count > 0
  }

  /**
   * Tìm đơn hàng gia công theo orderCode công khai cho màn hình Thẻ Gia Công. Mã đơn chỉ duy
   * nhất trong một tổ chức — tổ chức lấy từ token link đã xác minh, không bao giờ từ client.
   */
  async findSubcontractByCode(orderCode: string, organizationId: string) {
    return this.db.orders.findFirst({
      where: { organization_id: organizationId, code: orderCode },
      include: {
        coordination: true,
        items: true,
        greeting_sessions: true,
        customer: true,
      },
    })
  }

  /**
   * Tìm đơn hàng gia công theo ID (dùng cho Coordinator-Stream APIs nội bộ, có scope tenant).
   */
  async findSubcontractById(orderId: string, organizationId: string) {
    return this.db.orders.findFirst({
      where: { id: orderId, organization_id: organizationId },
      include: {
        coordination: true,
        items: true,
        greeting_sessions: true,
        customer: true,
      },
    })
  }

  /**
   * Tra cứu chi nhánh trong phạm vi tổ chức cho màn hình Thẻ Gia Công công khai. `branchId` là `branches.id`, hoặc
   * mã chi nhánh điều phối (`branches.code` có `accepts_dispatch`, ADR-012 T-4b) — khi đó `id` trả về là mã, như trước.
   */
  async findBranchInOrganization(branchId: string, orgId: string) {
    const dbBranch = await this.db.branches.findFirst({
      where: { id: branchId, organization_id: orgId },
      select: { id: true, name: true, is_active: true },
    })
    if (dbBranch) return dbBranch

    const dispatchBranch = await this.db.branches.findFirst({
      where: { organization_id: orgId, code: branchId, accepts_dispatch: true },
      select: { code: true, name: true, is_active: true },
    })
    if (dispatchBranch) return { id: dispatchBranch.code, name: dispatchBranch.name, is_active: dispatchBranch.is_active }

    return null
  }

  /**
   * Tra cứu settings tổ chức cho màn hình Thẻ Gia Công công khai.
   */
  async findOrganizationSettings(orgId: string) {
    const org = await this.db.organizations.findUnique({ where: { id: orgId }, select: { id: true, ...ORG_SETTINGS_SELECT } })
    return org ? withIndustryKey(org) : null // ngành theo cột (ADR-012 T-6c-1)
  }

  /** Đơn kèm dữ liệu cần để sàng lọc và phát lệnh điều phối chuỗi (route chain-dispatch). */
  async findOrderForChainDispatch(organizationId: string, orderId: string) {
    return this.db.orders.findFirst({
      where: { id: orderId, organization_id: organizationId },
      select: {
        id: true,
        organization_id: true,
        code: true,
        delivery_address: true,
        delivery_window: true,
        status: true,
        total_vnd: true,
        pricing_rule_ref: true,
        items: { select: { product_id: true, description: true, metadata: true } },
        greeting_sessions: { select: { product_snapshot: true }, take: 1 },
      },
    })
  }

  /** Dữ kiện khách duyệt ảnh thành phẩm của đơn (cùng nguồn với đơn 1 cửa hàng), hoặc `null`. */
  async loadPhotoApprovalFacts(organizationId: string, orderId: string) {
    return withOrganizationIndustry(await this.db.orders.findFirst({
      where: { id: orderId, organization_id: organizationId },
      select: {
        qc_records: { select: { notes: true, created_at: true } },
        greeting_sessions: { select: { catalog: { select: { filters: true } } } },
        organization: { select: ORG_SETTINGS_SELECT },
      },
    }))
  }

  /** Ghi đè `orders.pricing_rule_ref` (người gọi tự trộn với bản cũ). */
  async updatePricingRef(organizationId: string, orderId: string, pricingRef: Record<string, unknown>): Promise<void> {
    await this.db.orders.updateMany({
      where: { id: orderId, organization_id: organizationId },
      data: { pricing_rule_ref: pricingRef as Prisma.InputJsonValue },
    })
  }
}
