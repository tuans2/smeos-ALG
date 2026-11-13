import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { PartnerStoreMarketplaceEntity } from "../domain/partner-marketplace.types"
import {
  MAX_IMPORT_ROWS,
  MAX_PHOTOS_PER_STORE,
  normalizeTier,
  matchKeyOf,
  searchTextOf,
  type PartnerStoreProfile,
} from "../domain/partner-marketplace-row-mapper"
import {
  MAX_AUDIT_NAMES,
  type IPartnerMarketplaceRepository,
  type MarketplaceDeleteTarget,
  type MarketplaceImportSource,
  type MarketplacePhotoState,
} from "../domain/repositories/partner-marketplace-repository.interface"

/** Bảng cấp nền tảng (không có organization_id) — chỉ console vận hành truy cập, qua N1/N17. */
type Row = { id: string; profile: unknown; photo_keys: string[]; search_text: string }

function toEntity(row: Pick<Row, "id" | "profile">): PartnerStoreMarketplaceEntity {
  const profile = row.profile as PartnerStoreProfile
  // Hồ sơ cũ có thể còn hạng đã gộp — chuẩn hoá khi đọc
  const scoreAndTier = { ...profile.scoreAndTier, suggestedTier: normalizeTier(profile.scoreAndTier?.suggestedTier) }
  return { ...profile, scoreAndTier, id: row.id }
}


export class PartnerMarketplaceRepository implements IPartnerMarketplaceRepository {
  async listAll() {
    const rows = await prisma.partner_marketplace_stores.findMany({
      select: { id: true, profile: true, photo_keys: true, search_text: true },
      orderBy: { shop_name: "asc" },
      take: MAX_IMPORT_ROWS,
    })
    return rows.map((r) => ({ store: toEntity(r), searchText: r.search_text, photoKeys: r.photo_keys }))
  }

  async upsertMany(profiles: PartnerStoreProfile[], source: MarketplaceImportSource) {
    const keys = profiles.map((p) => matchKeyOf(p.identity.shopName))
    const existing = new Set(
      (await prisma.partner_marketplace_stores.findMany({ where: { match_key: { in: keys } }, select: { match_key: true } })).map(
        (r) => r.match_key
      )
    )
    await prisma.$transaction(
      profiles.map((profile, i) => {
        const data = {
          shop_name: profile.identity.shopName,
          tier: normalizeTier(profile.scoreAndTier.suggestedTier),
          address: profile.contact.address,
          profile: profile as unknown as Prisma.InputJsonValue,
          search_text: searchTextOf(profile),
          source,
        }
        return prisma.partner_marketplace_stores.upsert({
          where: { match_key: keys[i]! },
          create: { match_key: keys[i]!, ...data },
          update: data,
        })
      })
    )
    const added = keys.filter((k) => !existing.has(k)).length
    const total = await prisma.partner_marketplace_stores.count()
    return { added, updated: profiles.length - added, total }
  }

  async listPhotoPending(limit: number): Promise<{ items: MarketplacePhotoState[]; remaining: number }> {
    const rows = await prisma.partner_marketplace_stores.findMany({
      select: { id: true, profile: true, photo_keys: true, photo_source_ids: true },
      // Lâu chưa xử lý nhất trước — cửa hàng vừa thử (kể cả lỗi) xuống cuối, không kẹt vòng
      orderBy: { updated_at: "asc" },
      take: MAX_IMPORT_ROWS,
    })
    const pending = rows
      .map((r) => ({
        id: r.id,
        driveImageIds: (toEntity(r).media.driveImageIds ?? []).slice(0, MAX_PHOTOS_PER_STORE),
        photoKeys: r.photo_keys,
        photoSourceIds: r.photo_source_ids,
      }))
      // Còn ảnh Drive chưa có trong kho (mới thêm hoặc lần trước tải lỗi) → cần tải
      .filter((s) => s.driveImageIds.some((id) => !s.photoSourceIds.includes(id)))
    return { items: pending.slice(0, limit), remaining: Math.max(0, pending.length - limit) }
  }

  async setPhotos(id: string, photoKeys: string[], photoSourceIds: string[]) {
    await prisma.partner_marketplace_stores.update({
      where: { id },
      data: { photo_keys: photoKeys, photo_source_ids: photoSourceIds, updated_at: new Date() },
    })
  }

  async deleteById(id: string) {
    // deleteMany: không có dòng → count 0, không ném lỗi; đọc trước để trả tên cho nhật ký
    return prisma.$transaction(async (tx) => {
      const row = await tx.partner_marketplace_stores.findUnique({
        where: { id },
        select: { shop_name: true, source: true, photo_keys: true },
      })
      if (!row) return null
      const { count } = await tx.partner_marketplace_stores.deleteMany({ where: { id } })
      return count ? { shopName: row.shop_name, source: row.source, photoKeys: row.photo_keys } : null
    })
  }

  async deleteMany(target: MarketplaceDeleteTarget) {
    return prisma.$transaction(async (tx) => {
      const where = "ids" in target ? { id: { in: target.ids } } : {}
      if (!("ids" in target)) {
        const total = await tx.partner_marketplace_stores.count()
        if (total !== target.expectedTotal) return null
      }
      const rows = await tx.partner_marketplace_stores.findMany({
        where,
        select: { shop_name: true, photo_keys: true },
        orderBy: { shop_name: "asc" },
        take: MAX_IMPORT_ROWS,
      })
      const { count } = await tx.partner_marketplace_stores.deleteMany({ where })
      return {
        count,
        shopNames: rows.slice(0, MAX_AUDIT_NAMES).map((r) => r.shop_name),
        photoCount: rows.reduce((n, r) => n + r.photo_keys.length, 0),
      }
    })
  }
}

let instance: IPartnerMarketplaceRepository | null = null

export function getPartnerMarketplaceRepository(): IPartnerMarketplaceRepository {
  instance ??= new PartnerMarketplaceRepository()
  return instance
}
