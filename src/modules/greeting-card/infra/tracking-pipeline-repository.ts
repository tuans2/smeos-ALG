import { prisma } from "@/core/tenancy/infra/prisma"
import { branchScopedWhere, scopedWhere, type TenantContext } from "@/core/tenancy"
import { log } from "@/core/observability/log"
import { BROWSING_EVENT_TYPES } from "../domain/customer-journey-events"
import { signStorageUrl } from "@/modules/assets/infra/storage-signing"
import { driveThumbProxySrc } from "../domain/drive-thumb"

/** Bỏ các bước lướt mẫu vụn của khách — bảng theo dõi chỉ cần mốc nghiệp vụ. */
const MILESTONE_EVENTS = { event_type: { notIn: [...BROWSING_EVENT_TYPES] } }

/**
 * Cửa sổ của bảng theo dõi / Hộp việc. Bản cũ lấy 100 đơn + 50 link MỚI NHẤT bất kể trạng thái:
 * mùa lễ nhiều đơn thì đơn cũ đang kẹt rơi khỏi bảng và không ai được báo. Nay lấy MỌI đơn/link
 * còn việc (chưa xong, chưa huỷ, link còn hạn) + đơn hoàn tất trong 7 ngày; trần chỉ là lưới an toàn.
 */
export const PIPELINE_DONE_DAYS = 7
export const PIPELINE_IDLE_LINK_DAYS = 30
export const PIPELINE_MAX_ROWS = 2000

const ORDER_SELECT = {
  id: true, code: true, status: true, production_status: true, delivery_status: true,
  total_vnd: true, paid_vnd: true, balance_vnd: true, card_message: true, pricing_rule_ref: true,
  delivery_address: true, delivery_window: true, created_at: true, updated_at: true,
  customer: { select: { name: true, phone: true } },
  items: { take: 1, select: { product_id: true, metadata: true, description: true, unit_price_vnd: true } },
  payments: { select: { collected_at: true } },
  events: { select: { axis: true, created_at: true, actor_id: true, reason: true }, orderBy: { created_at: "desc" as const } },
  qc_records: { select: { created_at: true, inspector_id: true } },
  coordination: { select: { coordinator_id: true } },
  assignments: { take: 1, select: { assignee_id: true, assigned_by: true }, orderBy: { assigned_at: "desc" as const } },
  greeting_sessions: {
    take: 1,
    select: {
      id: true, send_code: true, sale_id: true, status: true, product_snapshot: true, selected_product_id: true,
      payment_proof_asset_id: true, payment_proof_balance_asset_id: true,
      catalog: { select: { id: true, name: true, code: true } },
      events: { where: MILESTONE_EVENTS, select: { event_type: true, created_at: true, metadata: true }, orderBy: { created_at: "asc" as const } },
    },
  },
} as const

export class TrackingPipelineRepository {
  constructor(private readonly db = prisma) {}

  async listBrochureOrders(ctx: TenantContext, saleId: string | null = null, now = new Date()) {
    const doneSince = new Date(now.getTime() - PIPELINE_DONE_DAYS * 86_400_000)
    const rows = await this.db.orders.findMany({
      // Đơn đang xử lý; đơn hoàn tất hoặc đã huỷ giữ 7 ngày gần nhất để đối soát/xem lại
      where: scopedWhere(ctx, {
        source: "BROCHURE", ...branchScopedWhere(ctx),
        OR: [
          { status: { notIn: ["COMPLETED" as const, "CANCELLED" as const] }, delivery_status: { not: "DELIVERED" as const } },
          { updated_at: { gte: doneSince } },
        ],
        ...(saleId ? { greeting_sessions: { some: { sale_id: saleId } } } : {}),
      }),
      select: ORDER_SELECT,
      orderBy: { created_at: "desc" },
      take: PIPELINE_MAX_ROWS,
    })
    if (rows.length >= PIPELINE_MAX_ROWS) {
      log.warn("greeting_card.pipeline_cap_reached", { organizationId: ctx.organizationId, feature: "greeting-card", kind: "orders" })
    }
    return rows
  }

  async listActiveSessions(ctx: TenantContext, saleId: string | null = null, now = new Date()) {
    const idleSince = new Date(now.getTime() - PIPELINE_IDLE_LINK_DAYS * 86_400_000)
    const doneSince = new Date(now.getTime() - PIPELINE_DONE_DAYS * 86_400_000)
    const rows = await this.db.greeting_sessions.findMany({
      // Link còn hạn chưa có đơn, hoặc link đã huỷ/hết hạn trong 7 ngày gần nhất
      where: scopedWhere(ctx, {
        order_id: null,
        last_active_at: { gte: idleSince },
        OR: [
          { revoked_at: null, OR: [{ expires_at: null }, { expires_at: { gt: now } }] },
          { updated_at: { gte: doneSince } },
        ],
        ...(saleId ? { sale_id: saleId } : {}),
      }),
      include: {
        catalog: { select: { id: true, name: true, code: true } },
        events: { where: MILESTONE_EVENTS, select: { event_type: true, created_at: true, metadata: true }, orderBy: { created_at: "asc" } },
      },
      orderBy: { last_active_at: "desc" },
      take: PIPELINE_MAX_ROWS,
    })
    if (rows.length >= PIPELINE_MAX_ROWS) {
      log.warn("greeting_card.pipeline_cap_reached", { organizationId: ctx.organizationId, feature: "greeting-card", kind: "links" })
    }
    return rows
  }

  /**
   * Nguồn dòng thời gian của MỘT đơn (hoặc một link chưa có đơn) — chỉ trong tổ chức; sale bị giới
   * hạn phạm vi được kiểm ở use-case. Đọc riêng một đối tượng, không đọc lại cả tập theo dõi.
   */
  async timelineSource(ctx: TenantContext, ref: { orderId?: string | undefined; sessionId?: string | undefined }) {
    const sessionSelect = {
      id: true, sale_id: true, created_at: true, send_code: true,
      payment_proof_asset_id: true, payment_proof_balance_asset_id: true,
      events: { where: MILESTONE_EVENTS, select: { event_type: true, created_at: true, metadata: true }, orderBy: { created_at: "asc" as const } },
    }
    if (ref.orderId) {
      const order = await this.db.orders.findFirst({
        where: scopedWhere(ctx, { id: ref.orderId, source: "BROCHURE", ...branchScopedWhere(ctx) }),
        select: {
          id: true, code: true, created_at: true,
          events: { select: { axis: true, from_value: true, to_value: true, reason: true, actor_id: true, created_at: true }, orderBy: { created_at: "asc" } },
          payments: { select: { kind: true, amount_vnd: true, collected_at: true, collected_by: true, note: true }, orderBy: { collected_at: "asc" } },
          qc_records: { select: { notes: true, image_asset_ids: true, created_at: true }, orderBy: { created_at: "asc" } },
          greeting_sessions: { take: 1, select: sessionSelect },
        },
      })
      return order ? { order, session: order.greeting_sessions[0] ?? null } : null
    }
    if (ref.sessionId) {
      const session = await this.db.greeting_sessions.findFirst({ where: scopedWhere(ctx, { id: ref.sessionId }), select: { ...sessionSelect, order_id: true } })
      return session ? { order: null, session } : null
    }
    return null
  }

  /** Kênh chia sẻ (`?kenh=`) của đơn đặt từ link bộ sưu tập công khai — theo sự kiện ORDER. */
  async orderChannels(ctx: TenantContext, orderIds: string[]): Promise<Map<string, string>> {
    if (orderIds.length === 0) return new Map()
    const rows = await this.db.greeting_catalog_events.findMany({
      where: scopedWhere(ctx, { event_type: "ORDER", order_id: { in: orderIds } }),
      select: { order_id: true, channel: true },
    })
    return new Map(rows.filter((r) => r.order_id).map((r) => [r.order_id as string, r.channel]))
  }

  /** Tên hiển thị của các thành viên tổ chức (sale phụ trách link) — chỉ người thuộc đúng tổ chức. */
  async memberNames(ctx: TenantContext, userIds: string[]): Promise<Map<string, string>> {
    const ids = [...new Set(userIds)].filter(Boolean)
    if (ids.length === 0) return new Map()
    const rows = await this.db.memberships.findMany({
      where: scopedWhere(ctx, { user_id: { in: ids } }),
      select: { user_id: true, user: { select: { name: true, email: true } } },
    })
    return new Map(rows.map((r) => [r.user_id, r.user.name?.trim() || r.user.email.split("@")[0] || "Nhân viên"]))
  }

  /**
   * Ảnh chính hiện tại của sản phẩm trong kho — bù cho đơn/link có ảnh chụp mẫu thiếu ảnh
   * (đơn tạo tay, mẫu chọn trước khi có ảnh), để mọi vai trò luôn nhận diện được mẫu hoa.
   */
  async productMainImages(ctx: TenantContext, productIds: string[]): Promise<Map<string, string>> {
    const ids = [...new Set(productIds.filter(Boolean))]
    if (ids.length === 0) return new Map()
    const rows = await this.db.products.findMany({
      where: scopedWhere(ctx, { id: { in: ids } }),
      // Ảnh chính trước; mẫu chưa đặt ảnh chính thì lấy ảnh đầu tiên của mẫu (thư viện, catalog...)
      select: { id: true, attributes: true, images: { orderBy: { position: "asc" }, take: 10, select: { asset_id: true, role: true } } },
    })
    const firstImage = (r: (typeof rows)[number]) => r.images.find((i) => i.role === "MAIN") ?? r.images[0]
    const assetIds = rows.flatMap((r) => { const img = firstImage(r); return img ? [img.asset_id] : [] })
    const assets = assetIds.length
      ? await this.db.assets.findMany({ where: scopedWhere(ctx, { id: { in: assetIds } }), select: { id: true, storage_key: true } })
      : []
    const keyOf = new Map(assets.map((a) => [a.id, a.storage_key]))
    const exp = Date.now() + 86_400_000
    const out = new Map<string, string>()
    for (const r of rows) {
      const img = firstImage(r)
      const key = img ? keyOf.get(img.asset_id) : undefined
      const attrs = (r.attributes as { imageUrl?: unknown; drive_link?: unknown } | null) ?? {}
      const attrUrl = typeof attrs.imageUrl === "string" && attrs.imageUrl ? attrs.imageUrl : null
      // Sản phẩm nhập từ Excel thường chỉ có link Google Drive — dùng ảnh xem trước qua proxy như bộ sưu tập
      const driveUrl = typeof attrs.drive_link === "string" ? driveThumbProxySrc(attrs.drive_link) : null
      const url = key ? `/api/v1/storage/${key}?exp=${exp}&sig=${signStorageUrl(key, exp)}` : attrUrl ?? driveUrl
      if (url) out.set(r.id, url)
    }
    return out
  }
}

let _trackingPipelineRepositorySingleton: TrackingPipelineRepository | null = null
export function getTrackingPipelineRepository(): TrackingPipelineRepository {
  if (!_trackingPipelineRepositorySingleton) _trackingPipelineRepositorySingleton = new TrackingPipelineRepository()
  return _trackingPipelineRepositorySingleton
}
