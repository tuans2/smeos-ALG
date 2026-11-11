/**
 * Thiết bị đã đồng ý nhận Web Push (`push_subscriptions`, checklist 4.30).
 *
 * Ghi/xoá theo phiên đi qua `scopedWhere`/`scopedData`: chỉ thiết bị của chính người gọi trong tổ chức của phiên.
 * Đọc để gửi dùng `organizationId` + `userId` của người nhận do `notifyOrganization` xác định (không từ thân yêu cầu).
 *
 * @module notification/infra
 */
import type { TenantContext } from "@/core/tenancy"
import { scopedData, scopedWhere } from "@/core/tenancy/tenant-context"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { PushSubscriptionKeys } from "../adapters/web-push-protocol"

/** Trần số thiết bị mỗi người — chặn một tài khoản tự đăng ký vô hạn endpoint. */
export const MAX_DEVICES_PER_USER = 10

export interface StoredPushSubscription extends PushSubscriptionKeys {
  id: string
}

export class PushSubscriptionRepository {
  /** Lưu thiết bị của người gọi. Cùng endpoint (cùng trình duyệt) trong tổ chức này đăng nhập người khác thì chuyển sang người này. */
  async saveForCaller(ctx: TenantContext, sub: PushSubscriptionKeys, userAgent: string | null): Promise<void> {
    const data = { user_id: ctx.userId, p256dh: sub.p256dh, auth: sub.auth, user_agent: userAgent?.slice(0, 300) ?? null }
    await prisma.$transaction(async (tx) => {
      await tx.push_subscriptions.upsert({
        where: { organization_id_endpoint: { organization_id: ctx.organizationId, endpoint: sub.endpoint } },
        create: scopedData(ctx, { ...data, endpoint: sub.endpoint }),
        update: data,
      })
      const extra = await tx.push_subscriptions.findMany({
        where: scopedWhere(ctx, { user_id: ctx.userId }),
        orderBy: { created_at: "desc" },
        skip: MAX_DEVICES_PER_USER,
        select: { id: true },
      })
      if (extra.length) await tx.push_subscriptions.deleteMany({ where: { id: { in: extra.map((r) => r.id) } } })
    })
  }

  /** Bỏ thiết bị của chính người gọi; endpoint của người / tổ chức khác không bị đụng. */
  async removeForCaller(ctx: TenantContext, endpoint: string): Promise<boolean> {
    const res = await prisma.push_subscriptions.deleteMany({ where: scopedWhere(ctx, { user_id: ctx.userId, endpoint }) })
    return res.count > 0
  }

  async countForCaller(ctx: TenantContext): Promise<number> {
    return prisma.push_subscriptions.count({ where: scopedWhere(ctx, { user_id: ctx.userId }) })
  }

  async hasEndpointForCaller(ctx: TenantContext, endpoint: string): Promise<boolean> {
    return (await prisma.push_subscriptions.count({ where: scopedWhere(ctx, { user_id: ctx.userId, endpoint }) })) > 0
  }

  /** Thiết bị của một người nhận trong một tổ chức — dùng khi gửi. */
  async listForRecipient(organizationId: string, userId: string): Promise<StoredPushSubscription[]> {
    const rows = await prisma.push_subscriptions.findMany({
      where: { organization_id: organizationId, user_id: userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
      take: MAX_DEVICES_PER_USER,
    })
    return rows
  }

  /** Tổ chức có thiết bị của người này (gửi thử từ Console tầng Mẹ — người vận hành không có phiên tổ chức). */
  async organizationWithDeviceOf(userId: string): Promise<string | null> {
    const row = await prisma.push_subscriptions.findFirst({ where: { user_id: userId }, orderBy: { created_at: "desc" }, select: { organization_id: true } })
    return row?.organization_id ?? null
  }

  /** Dịch vụ đẩy báo thiết bị đã huỷ đăng ký (404/410) → xoá. */
  async removeExpired(organizationId: string, id: string): Promise<void> {
    await prisma.push_subscriptions.deleteMany({ where: { id, organization_id: organizationId } })
  }

  async markSuccess(organizationId: string, id: string): Promise<void> {
    await prisma.push_subscriptions.updateMany({ where: { id, organization_id: organizationId }, data: { last_success_at: new Date() } })
  }
}
