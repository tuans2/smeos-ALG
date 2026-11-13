import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy/tenant-context"
import type { DeviceKind, ShortLinkKind } from "../domain/short-link-rules"
import type { Utm } from "../domain/lead-rules"

export interface ShortLinkWrite {
  name: string
  targetPath: string
  placementLabel: string | null
  utm: Utm
  expiresAt: Date | null
}

const SELECT = {
  id: true, code: true, kind: true, name: true, target_path: true, placement_label: true,
  utm_source: true, utm_medium: true, utm_campaign: true, expires_at: true, is_active: true,
  scan_count: true, created_at: true, updated_at: true,
  _count: { select: { leads: true } },
} as const

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002"
}

export class ShortLinkRepository {
  /** `nextCode` sinh mã mới mỗi lần; trùng mã (hiếm) → thử lại, tối đa 5 lần. */
  async create(ctx: TenantContext, kind: ShortLinkKind, data: ShortLinkWrite, nextCode: () => string) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await prisma.short_links.create({
          data: scopedData(ctx, {
            code: nextCode(),
            kind,
            name: data.name,
            target_path: data.targetPath,
            placement_label: data.placementLabel,
            utm_source: data.utm.source,
            utm_medium: data.utm.medium,
            utm_campaign: data.utm.campaign,
            expires_at: data.expiresAt,
            created_by: ctx.userId,
          }),
          select: SELECT,
        })
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
      }
    }
    throw new Error("Không sinh được mã link duy nhất")
  }

  async list(ctx: TenantContext, opts: { kind?: ShortLinkKind | undefined; limit: number; cursor?: string | undefined }) {
    const rows = await prisma.short_links.findMany({
      where: scopedWhere(ctx, opts.kind ? { kind: opts.kind } : {}),
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: opts.limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select: SELECT,
    })
    const hasMore = rows.length > opts.limit
    const items = hasMore ? rows.slice(0, opts.limit) : rows
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null }
  }

  async findById(ctx: TenantContext, id: string) {
    return prisma.short_links.findFirst({ where: scopedWhere(ctx, { id }), select: SELECT })
  }

  async update(ctx: TenantContext, id: string, patch: Partial<ShortLinkWrite> & { isActive?: boolean }) {
    const data: Record<string, unknown> = {}
    if (patch.name !== undefined) data.name = patch.name
    if (patch.targetPath !== undefined) data.target_path = patch.targetPath
    if (patch.placementLabel !== undefined) data.placement_label = patch.placementLabel
    if (patch.expiresAt !== undefined) data.expires_at = patch.expiresAt
    if (patch.isActive !== undefined) data.is_active = patch.isActive
    if (patch.utm !== undefined) {
      data.utm_source = patch.utm.source
      data.utm_medium = patch.utm.medium
      data.utm_campaign = patch.utm.campaign
    }
    const res = await prisma.short_links.updateMany({ where: scopedWhere(ctx, { id }), data })
    return res.count > 0
  }

  /** Thống kê lượt quét theo ngày và thiết bị trong khoảng `since` → nay. */
  async stats(ctx: TenantContext, id: string, since: Date) {
    const where = scopedWhere(ctx, { short_link_id: id, created_at: { gte: since } })
    const [byDevice, events, uniqueVisitors] = await Promise.all([
      prisma.link_events.groupBy({ by: ["device"], where, _count: { _all: true } }),
      prisma.link_events.findMany({ where, select: { created_at: true }, orderBy: { created_at: "asc" }, take: 10_000 }),
      prisma.link_events.findMany({ where: { ...where, visitor_hash: { not: null } }, distinct: ["visitor_hash"], select: { visitor_hash: true }, take: 10_000 }),
    ])
    return {
      byDevice: Object.fromEntries(byDevice.map((g) => [g.device, g._count._all])),
      eventDates: events.map((e) => e.created_at),
      uniqueVisitors: uniqueVisitors.length,
    }
  }

  // ── Công khai: tổ chức suy từ mã, không từ client ──

  async findPublicByCode(code: string) {
    return prisma.short_links.findUnique({
      where: { code },
      select: { id: true, organization_id: true, code: true, target_path: true, is_active: true, expires_at: true, utm_source: true, utm_medium: true, utm_campaign: true },
    })
  }

  async recordEvent(link: { id: string; organization_id: string }, event: { device: DeviceKind; referrerHost: string | null; visitorHash: string | null }) {
    await prisma.$transaction([
      prisma.link_events.create({
        data: { organization_id: link.organization_id, short_link_id: link.id, device: event.device, referrer_host: event.referrerHost, visitor_hash: event.visitorHash },
      }),
      prisma.short_links.update({ where: { id: link.id }, data: { scan_count: { increment: 1 } } }),
    ])
  }
}
