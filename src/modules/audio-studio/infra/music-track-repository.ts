/**
 * MusicTrackRepository — Infra layer cho Audio Studio.
 * Bảng `music_tracks` (TENANT, 24/09/2026): nhạc nền tiệm tự tải kèm hồ sơ giấy phép.
 * Thư viện hệ thống ở `music-catalog.ts`.
 *
 * Interface IMusicTrackRepository nằm tại domain/repositories/music-track-repository.interface.ts
 */

import type { Prisma, PrismaClient, music_tracks } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import type {
  IMusicTrackRepository,
  MusicTrackData,
  CreateMusicTrackData,
} from "../domain/repositories/music-track-repository.interface"

type DbClient = PrismaClient | Prisma.TransactionClient

export type { music_tracks }
export type { IMusicTrackRepository }

// ============================================================
// IMPLEMENTATION
// ============================================================

export class MusicTrackRepository implements IMusicTrackRepository {
  constructor(private readonly db: DbClient = prisma) {}

  create(ctx: TenantContext, data: CreateMusicTrackData): Promise<MusicTrackData> {
    return this.db.music_tracks.create({
      data: scopedData(ctx, {
        id: data.id,
        title: data.title,
        mood: data.mood,
        storage_key: data.storageKey,
        mime_type: data.mimeType,
        file_bytes: data.fileBytes,
        license_type: data.licenseType,
        license_source: data.licenseSource,
        license_note: data.licenseNote,
        attested_by: ctx.userId,
        attested_at: new Date(),
      }),
    }) as unknown as Promise<MusicTrackData>
  }

  findById(ctx: TenantContext, id: string): Promise<MusicTrackData | null> {
    return this.db.music_tracks.findFirst({
      where: scopedWhere(ctx, { id, deleted_at: null }),
    }) as unknown as Promise<MusicTrackData | null>
  }

  list(ctx: TenantContext): Promise<MusicTrackData[]> {
    return this.db.music_tracks.findMany({
      where: scopedWhere(ctx, { deleted_at: null }),
      orderBy: { created_at: "desc" },
      take: 200,
    }) as unknown as Promise<MusicTrackData[]>
  }

  async markDeleted(ctx: TenantContext, id: string): Promise<boolean> {
    const r = await this.db.music_tracks.updateMany({
      where: scopedWhere(ctx, { id, deleted_at: null }),
      data: { deleted_at: new Date() },
    })
    return r.count > 0
  }
}

// ============================================================
// SINGLETON FACTORY
// ============================================================

let _instance: MusicTrackRepository | undefined

/** Trả về singleton MusicTrackRepository (inject mặc định cho use-cases). */
export function getMusicTrackRepository(): IMusicTrackRepository {
  _instance ??= new MusicTrackRepository()
  return _instance
}
