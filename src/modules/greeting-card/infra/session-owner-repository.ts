import { prisma } from "@/core/tenancy/infra/prisma"
import { OWNER_CLAIMED_EVENT } from "../domain/session-owner"
import { SHARE_OPEN_EVENT } from "../domain/link-ownership"

/** Đánh dấu chủ phiên Thẻ chào (đường công khai — phiên đã được tra theo mã trước đó). */
export class SessionOwnerRepository {
  constructor(private readonly db = prisma) {}

  /** Tra nhẹ phiên theo mã (trùng mã → coi như không có, như `getPublicSessionBySendCode`). */
  async findSession(sendCode: string) {
    const rows = await this.db.greeting_sessions.findMany({
      where: { send_code: sendCode.toUpperCase().trim() },
      select: { id: true, organization_id: true, send_code: true },
      take: 2,
    })
    return rows.length === 1 ? rows[0]! : null
  }

  /** SĐT người đặt của đơn gắn với phiên (`null` = phiên chưa có đơn) — để mở lại link ở trình duyệt khác. */
  async orderPhoneOf(organizationId: string, sessionId: string): Promise<string | null> {
    const row = await this.db.greeting_sessions.findFirst({
      where: { id: sessionId, organization_id: organizationId, order_id: { not: null } },
      select: { customer_phone: true, order: { select: { customer: { select: { phone: true } } } } },
    })
    if (!row) return null
    return row.order?.customer?.phone ?? row.customer_phone ?? ""
  }

  async isClaimed(organizationId: string, sessionId: string): Promise<boolean> {
    const row = await this.db.greeting_journey_events.findFirst({
      where: { organization_id: organizationId, session_id: sessionId, event_type: OWNER_CLAIMED_EVENT },
      select: { id: true },
    })
    return row !== null
  }

  /**
   * Nhận chủ phiên. Khoá theo phiên trong giao dịch: hai tab/thiết bị mở cùng lúc thì chỉ
   * một bên nhận được (`true`), bên còn lại `false`. `force` = ghi mốc cả khi đã có chủ
   * (máy chủ vừa tạo phiên cho chính trình duyệt này).
   */
  async claim(organizationId: string, sessionId: string, source: string, force = false): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`brochure-owner:${sessionId}`}))`
      const existing = await tx.greeting_journey_events.findFirst({
        where: { organization_id: organizationId, session_id: sessionId, event_type: OWNER_CLAIMED_EVENT },
        select: { id: true },
      })
      if (existing && !force) return false
      if (!existing) {
        await tx.greeting_journey_events.create({
          data: { organization_id: organizationId, session_id: sessionId, event_type: OWNER_CLAIMED_EVENT, metadata: { source } },
        })
      }
      return true
    })
  }

  /** Mã link chia sẻ `/s/<mã>` đã sinh ra phiên này (nếu có) — để người khác mở được phiên riêng. */
  async shareCodeOf(organizationId: string, sessionId: string): Promise<string | null> {
    const opened = await this.db.greeting_journey_events.findFirst({
      where: { organization_id: organizationId, session_id: sessionId, event_type: SHARE_OPEN_EVENT },
      select: { metadata: true },
    })
    const linkId = (opened?.metadata as { shareLinkId?: unknown } | null)?.shareLinkId
    if (typeof linkId !== "string") return null
    const link = await this.db.greeting_share_links.findFirst({
      where: { id: linkId, organization_id: organizationId, revoked_at: null },
      select: { code: true },
    })
    return link?.code ?? null
  }
}

let _sessionOwnerRepositorySingleton: SessionOwnerRepository | null = null
export function getSessionOwnerRepository(): SessionOwnerRepository {
  if (!_sessionOwnerRepositorySingleton) _sessionOwnerRepositorySingleton = new SessionOwnerRepository()
  return _sessionOwnerRepositorySingleton
}
