/**
 * IMusicTrackRepository — Port Interface cho Audio Studio.
 *
 * Đặt tại domain/ để use-cases inject qua interface thay vì
 * import trực tiếp từ infra (Dependency Inversion).
 *
 * domain/ KHÔNG import Prisma hay bất kỳ infra nào.
 */

import type { TenantContext } from "@/core/tenancy"

export interface MusicTrackData {
  readonly id: string
  readonly organization_id: string
  readonly title: string
  readonly mood: string
  readonly storage_key: string
  readonly mime_type: string
  readonly file_bytes: number
  readonly duration_seconds: number | null
  readonly license_type: string
  readonly license_source: string
  readonly license_note: string | null
  readonly attested_by: string
  readonly attested_at: Date
  readonly deleted_at: Date | null
  readonly created_at: Date
  readonly updated_at: Date
}

export interface CreateMusicTrackData {
  readonly id: string
  readonly title: string
  readonly mood: string
  readonly storageKey: string
  readonly mimeType: string
  readonly fileBytes: number
  readonly licenseType: string
  readonly licenseSource: string
  readonly licenseNote: string | null
}

export interface IMusicTrackRepository {
  create(ctx: TenantContext, data: CreateMusicTrackData): Promise<MusicTrackData>
  findById(ctx: TenantContext, id: string): Promise<MusicTrackData | null>
  list(ctx: TenantContext): Promise<MusicTrackData[]>
  markDeleted(ctx: TenantContext, id: string): Promise<boolean>
}
