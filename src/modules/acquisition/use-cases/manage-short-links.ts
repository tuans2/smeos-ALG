import { randomBytes } from "node:crypto"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { notFound, validationFailed } from "@/core/http/errors"
import {
  PLACEMENT_LABEL_MAX,
  SHORT_LINK_KINDS,
  SHORT_LINK_NAME_MAX,
  defaultUtmMedium,
  generateShortLinkCode,
  isSafeTargetPath,
  normalizeUtm,
  type ShortLinkKind,
} from "../domain/short-link-rules"
import { ShortLinkRepository, type ShortLinkWrite } from "../infra/short-link-repository"

const STATS_MAX_DAYS = 90

export interface ShortLinkInput {
  name?: string | undefined
  targetPath?: string | undefined
  placementLabel?: string | null | undefined
  utmSource?: string | null | undefined
  utmMedium?: string | null | undefined
  utmCampaign?: string | null | undefined
  expiresAt?: string | null | undefined
  isActive?: boolean | undefined
}

function parseWrite(input: ShortLinkInput, partial: boolean): Partial<ShortLinkWrite> {
  const errors: Record<string, string> = {}
  const out: Partial<ShortLinkWrite> = {}
  if (input.name !== undefined || !partial) {
    const name = (input.name ?? "").trim()
    if (!name || name.length > SHORT_LINK_NAME_MAX) errors.name = `Tên từ 1 đến ${SHORT_LINK_NAME_MAX} ký tự`
    else out.name = name
  }
  if (input.targetPath !== undefined || !partial) {
    const target = (input.targetPath ?? "").trim()
    if (!isSafeTargetPath(target)) errors.targetPath = "Trang đích phải là đường dẫn trong cửa hàng, bắt đầu bằng /"
    else out.targetPath = target
  }
  if (input.placementLabel !== undefined) {
    const label = input.placementLabel?.trim() || null
    if (label && label.length > PLACEMENT_LABEL_MAX) errors.placementLabel = `Vị trí đặt tối đa ${PLACEMENT_LABEL_MAX} ký tự`
    else out.placementLabel = label
  }
  if (input.expiresAt !== undefined) {
    if (input.expiresAt === null || input.expiresAt === "") out.expiresAt = null
    else {
      const d = new Date(input.expiresAt)
      if (Number.isNaN(d.getTime())) errors.expiresAt = "Ngày hết hạn không hợp lệ"
      else out.expiresAt = d
    }
  }
  if (input.utmSource !== undefined || input.utmMedium !== undefined || input.utmCampaign !== undefined) {
    out.utm = normalizeUtm({ source: input.utmSource, medium: input.utmMedium, campaign: input.utmCampaign })
  }
  if (Object.keys(errors).length > 0) throw validationFailed(errors)
  return out
}

/** Tạo link/QR động (công cụ 12, 13, 25). UTM medium mặc định theo loại. */
export async function createShortLink(ctx: TenantContext, kind: string, input: ShortLinkInput, repo = new ShortLinkRepository()) {
  if (!(SHORT_LINK_KINDS as readonly string[]).includes(kind)) throw validationFailed({ kind: "Phải là QR hoặc SALES_LINK" })
  const parsed = parseWrite(input, false)
  const k = kind as ShortLinkKind
  const utm = parsed.utm ?? normalizeUtm({})
  const write: ShortLinkWrite = {
    name: parsed.name!,
    targetPath: parsed.targetPath!,
    placementLabel: parsed.placementLabel ?? null,
    utm: { source: utm.source ?? "smeos", medium: utm.medium ?? defaultUtmMedium(k), campaign: utm.campaign },
    expiresAt: parsed.expiresAt ?? null,
  }
  return repo.create(ctx, k, write, () => generateShortLinkCode(randomBytes(16)))
}

export async function listShortLinks(
  ctx: TenantContext,
  opts: { kind?: string | undefined; limit: number; cursor?: string | undefined },
  repo = new ShortLinkRepository(),
) {
  if (opts.kind !== undefined && !(SHORT_LINK_KINDS as readonly string[]).includes(opts.kind)) {
    throw validationFailed({ kind: "Phải là QR hoặc SALES_LINK" })
  }
  return repo.list(ctx, { kind: opts.kind as ShortLinkKind | undefined, limit: opts.limit, cursor: opts.cursor })
}

/** Đổi đích/tên/vị trí/hạn hoặc bật-tắt. Mã đã in không đổi. Link tổ chức khác → 404. */
export async function updateShortLink(ctx: TenantContext, id: string, input: ShortLinkInput, repo = new ShortLinkRepository()) {
  const parsed = parseWrite(input, true)
  const patch = input.isActive !== undefined ? { ...parsed, isActive: input.isActive } : parsed
  if (!(await repo.update(ctx, id, patch))) throw notFound()
  return repo.findById(ctx, id)
}

/** Lượt quét theo ngày (giờ Việt Nam) + thiết bị + khách riêng + số lead sinh ra. */
export async function getShortLinkStats(ctx: TenantContext, id: string, days: number, repo = new ShortLinkRepository(), now = new Date()) {
  if (!Number.isInteger(days) || days < 1 || days > STATS_MAX_DAYS) throw validationFailed({ days: `Từ 1 đến ${STATS_MAX_DAYS} ngày` })
  const link = await repo.findById(ctx, id)
  if (!link) throw notFound()
  const since = new Date(now.getTime() - days * 86_400_000)
  const raw = await repo.stats(ctx, id, since)
  const byDay: Record<string, number> = {}
  for (const d of raw.eventDates) {
    const key = new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10)
    byDay[key] = (byDay[key] ?? 0) + 1
  }
  return {
    link,
    days,
    totalScans: raw.eventDates.length,
    uniqueVisitors: raw.uniqueVisitors,
    leads: link._count.leads,
    byDevice: raw.byDevice,
    byDay,
  }
}
