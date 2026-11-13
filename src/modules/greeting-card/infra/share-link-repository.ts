import { randomUUID } from "node:crypto"
import { notFound } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { generateSendCode, randomCode } from "../domain/greeting-card-rules"
import { LINK_COPIED_EVENT, SHARE_CODE_LENGTH, SHARE_OPEN_EVENT } from "../domain/link-ownership"

const ATTEMPTS = 5

/** Link sao chép mang tên người bấm + phiên riêng cho từng khách mở link đó. */
export class ShareLinkRepository {
  constructor(private readonly db = prisma) {}

  async create(ctx: TenantContext, input: { catalogId: string; channel: string | null }) {
    const catalog = await this.db.greeting_catalogs.findFirst({ where: scopedWhere(ctx, { id: input.catalogId, is_active: true }), select: { id: true } })
    if (!catalog) throw notFound()
    for (let i = 0; i < ATTEMPTS; i++) {
      const code = randomCode(SHARE_CODE_LENGTH)
      if (await this.db.greeting_share_links.findUnique({ where: { code }, select: { id: true } })) continue
      return this.db.greeting_share_links.create({
        data: scopedData(ctx, { id: randomUUID(), code, catalog_id: catalog.id, owner_id: ctx.userId, channel: input.channel }),
        select: { id: true, code: true, created_at: true },
      })
    }
    throw new Error("Không sinh được mã link duy nhất")
  }

  /** Tra link công khai theo mã (không cần đăng nhập) — link thu hồi / bộ sưu tập đã ẩn → null. */
  async findActive(code: string) {
    return this.db.greeting_share_links.findFirst({
      where: { code, revoked_at: null, catalog: { is_active: true } },
      select: {
        id: true, organization_id: true, catalog_id: true, owner_id: true, channel: true, code: true,
        catalog: { select: { filters: true } },
      },
    })
  }

  /** Phiên của một khách vừa mở link — tính cho người đã sao chép link. */
  async openVisitorSession(link: { id: string; organization_id: string; catalog_id: string; owner_id: string; channel: string | null }, expiresAt: Date | null) {
    const now = new Date()
    for (let i = 0; i < ATTEMPTS; i++) {
      const sendCode = generateSendCode("SL")
      if (await this.db.greeting_sessions.findFirst({ where: { send_code: sendCode }, select: { id: true } })) continue
      const session = await this.db.greeting_sessions.create({
        data: {
          organization_id: link.organization_id, catalog_id: link.catalog_id, send_code: sendCode, sale_id: link.owner_id,
          status: "OPENED", opened_at: now, expires_at: expiresAt,
        },
        select: { id: true, send_code: true },
      })
      await this.db.greeting_journey_events.create({
        data: { organization_id: link.organization_id, session_id: session.id, event_type: SHARE_OPEN_EVENT, metadata: { shareLinkId: link.id, channel: link.channel } },
      })
      return session
    }
    throw new Error("Không sinh được mã phiên duy nhất")
  }

  /** Link đã sao chép kèm số khách đã mở và số đơn (`ownerId` = chỉ của một người). */
  async listWithStats(ctx: TenantContext, ownerId: string | null, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000)
    const links = await this.db.greeting_share_links.findMany({
      where: scopedWhere(ctx, { created_at: { gte: since }, ...(ownerId ? { owner_id: ownerId } : {}) }),
      select: { id: true, code: true, owner_id: true, channel: true, created_at: true, revoked_at: true, catalog: { select: { name: true } } },
      orderBy: { created_at: "desc" },
      take: 100,
    })
    if (links.length === 0) return []
    const opens = await this.db.greeting_journey_events.findMany({
      where: scopedWhere(ctx, { event_type: SHARE_OPEN_EVENT, created_at: { gte: since } }),
      select: { metadata: true, session: { select: { order_id: true } } },
      take: 10_000,
    })
    const stats = new Map<string, { opens: number; orders: number }>()
    for (const e of opens) {
      const id = (e.metadata as Record<string, unknown> | null)?.shareLinkId
      if (typeof id !== "string") continue
      const s = stats.get(id) ?? { opens: 0, orders: 0 }
      s.opens += 1
      if (e.session.order_id) s.orders += 1
      stats.set(id, s)
    }
    return links.map((l) => ({ ...l, opens: stats.get(l.id)?.opens ?? 0, orders: stats.get(l.id)?.orders ?? 0 }))
  }

  /** Phiên khách đã mở trước đó (cookie) — chỉ nếu cùng tổ chức và chưa thu hồi. */
  async existingVisitorSession(organizationId: string, sendCode: string) {
    return this.db.greeting_sessions.findFirst({ where: { send_code: sendCode, organization_id: organizationId, revoked_at: null }, select: { id: true, send_code: true } })
  }

  /** Link riêng theo mã gửi + đã có mốc sao chép chưa. */
  async sessionForCopy(ctx: TenantContext, sendCode: string) {
    return this.db.greeting_sessions.findFirst({
      where: scopedWhere(ctx, { send_code: sendCode }),
      select: { id: true, sale_id: true, events: { where: { event_type: LINK_COPIED_EVENT }, select: { id: true }, take: 1 } },
    })
  }

  /** Dữ liệu chọn người phụ trách mặc định: cài đặt, thành viên đang hoạt động, chủ tiệm (Điều hành vào sớm nhất). */
  async ownerCandidates(organizationId: string) {
    const [org, members, adminRoles] = await Promise.all([
      this.db.organizations.findUnique({ where: { id: organizationId }, select: { settings: true } }),
      this.db.memberships.findMany({
        where: { organization_id: organizationId, status: "ACTIVE" },
        select: { user_id: true, role_id: true },
        orderBy: [{ joined_at: "asc" }, { invited_at: "asc" }],
      }),
      this.db.roles.findMany({ where: { key: "dieu_hanh", OR: [{ organization_id: null }, { organization_id: organizationId }] }, select: { id: true } }),
    ])
    const adminIds = new Set(adminRoles.map((r) => r.id))
    return {
      settings: org?.settings ?? null,
      activeMemberIds: members.map((m) => m.user_id),
      founderId: members.find((m) => adminIds.has(m.role_id))?.user_id ?? members[0]?.user_id ?? null,
    }
  }

  async catalogPreview(catalogId: string) {
    return this.db.greeting_catalogs.findFirst({ where: { id: catalogId, is_active: true }, select: { name: true, description: true } })
  }
}

let _shareLinkRepositorySingleton: ShareLinkRepository | null = null
export function getShareLinkRepository(): ShareLinkRepository {
  if (!_shareLinkRepositorySingleton) _shareLinkRepositorySingleton = new ShareLinkRepository()
  return _shareLinkRepositorySingleton
}
