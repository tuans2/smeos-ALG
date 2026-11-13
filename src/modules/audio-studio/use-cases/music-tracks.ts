/**
 * Thư viện nhạc nền Khu vực C (quyết định PO 24/09/2026: thư viện có giấy
 * phép + tiệm tự tải).
 *
 * Hai nguồn, một danh sách:
 *   - Hệ thống: `music-catalog.ts` (tệp ở `workers/media_ai/video/assets/music/`),
 *     mã = `trackId`, có `licenseSource`/`licenseVerified`.
 *   - Tiệm tự tải: bảng `music_tracks`, mã = `org:<uuid>`, bắt buộc khai loại
 *     giấy phép + nguồn và tick cam kết.
 */

import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { notFound, unprocessable, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import {
  MUSIC_LICENSE_TYPES,
  MUSIC_UPLOAD_MAX_BYTES,
  ORG_TRACK_PREFIX,
  UPLOAD_MUSIC_MOODS,
  isOrgTrackId,
  orgTrackUuid,
  sniffAudioExtension,
} from "../domain/audio-task-rules"
import { MUSIC_CATALOG, getMusicTrack } from "../domain/music-catalog"
import { getMusicTrackRepository } from "../infra/music-track-repository"
import type { IMusicTrackRepository, MusicTrackData } from "../domain/repositories/music-track-repository.interface"


const MIME_BY_EXT = { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4" } as const
const SYSTEM_MUSIC_DIR = path.join(process.cwd(), "workers", "media_ai", "video", "assets", "music")

export interface MusicTrackView {
  readonly track_id: string
  readonly title: string
  readonly mood: string
  readonly duration_seconds: number | null
  readonly source: "system" | "org"
  readonly license_type: string
  readonly license_source: string
  readonly license_verified: boolean
  readonly preview_url: string
}

async function orgView(row: MusicTrackData): Promise<MusicTrackView> {
  return {
    track_id: `${ORG_TRACK_PREFIX}${row.id}`,
    title: row.title,
    mood: row.mood,
    duration_seconds: row.duration_seconds,
    source: "org",
    license_type: row.license_type,
    license_source: row.license_source,
    // Tiệm đã khai nguồn + tick cam kết — trách nhiệm pháp lý thuộc tiệm.
    license_verified: true,
    preview_url: await getStorageProvider().signedUrl(row.storage_key, 3600),
  }
}

export async function listMusicTracks(ctx: TenantContext): Promise<MusicTrackView[]> {
  requireCapability(ctx, "I1")
  const system: MusicTrackView[] = MUSIC_CATALOG.map((t) => ({
    track_id: t.trackId,
    title: t.displayName,
    mood: t.mood,
    duration_seconds: t.durationSeconds,
    source: "system",
    license_type: t.license,
    license_source: t.licenseSource,
    license_verified: t.licenseVerified,
    preview_url: `/api/v1/audio/music-tracks/system/${encodeURIComponent(t.trackId)}`,
  }))
  const org = await Promise.all((await getMusicTrackRepository().list(ctx)).map(orgView))
  return [...org, ...system]
}

export async function uploadMusicTrack(
  ctx: TenantContext,
  input: {
    title: string
    mood: string
    licenseType: string
    licenseSource: string
    licenseNote?: string | null
    attest: boolean
    file: Uint8Array
  }
): Promise<MusicTrackView> {
  requireCapability(ctx, "I1")
  const title = input.title.trim()
  const errors: Record<string, string> = {}
  if (title.length < 2 || title.length > 120) errors.title = "Tên bài 2–120 ký tự"
  if (!(UPLOAD_MUSIC_MOODS as readonly string[]).includes(input.mood)) errors.mood = "Mood không hợp lệ"
  if (!(MUSIC_LICENSE_TYPES as readonly string[]).includes(input.licenseType)) errors.license_type = "Loại giấy phép không hợp lệ"
  if (input.file.byteLength === 0 || input.file.byteLength > MUSIC_UPLOAD_MAX_BYTES) errors.file = "Tệp tối đa 20MB"
  const ext = sniffAudioExtension(input.file)
  if (!ext) errors.file = "Chỉ nhận MP3, WAV hoặc M4A"
  if (Object.keys(errors).length > 0 || !ext) throw validationFailed(errors)
  // Luật giấy phép (đúng dạng nhưng chưa đủ cam kết) → 422, tách khỏi lỗi dạng 400.
  const license: Record<string, string> = {}
  if (input.licenseSource.trim().length < 3) license.license_source = "Ghi nguồn / nơi mua / đường dẫn giấy phép"
  if (!input.attest) license.attest = "Phải xác nhận tiệm có quyền dùng bài này cho quảng cáo"
  if (Object.keys(license).length > 0) throw unprocessable("Thiếu cam kết giấy phép bài nhạc", license)

  const id = randomUUID()
  const storageKey = `org/${ctx.organizationId}/audio/music/${id}.${ext}`
  await getStorageProvider().put(storageKey, input.file, MIME_BY_EXT[ext])
  const row = await getMusicTrackRepository().create(ctx, {
    id,
    title,
    mood: input.mood,
    storageKey,
    mimeType: MIME_BY_EXT[ext],
    fileBytes: input.file.byteLength,
    licenseType: input.licenseType,
    licenseSource: input.licenseSource.trim().slice(0, 500),
    licenseNote: input.licenseNote?.trim().slice(0, 1000) || null,
  })
  return orgView(row)
}

export async function deleteMusicTrack(ctx: TenantContext, trackId: string): Promise<void> {
  requireCapability(ctx, "I1")
  const id = isOrgTrackId(trackId) ? orgTrackUuid(trackId) : trackId
  const ok = await getMusicTrackRepository().markDeleted(ctx, id)
  if (!ok) throw notFound()
}

/** Tệp nhạc hệ thống để nghe thử (route `GET /audio/music-tracks/system/:trackId`). */
export async function readSystemTrack(ctx: TenantContext, trackId: string): Promise<{ bytes: Uint8Array; mime: string }> {
  requireCapability(ctx, "I1")
  const track = getMusicTrack(trackId)
  if (!track) throw notFound()
  const bytes = await readFile(path.join(SYSTEM_MUSIC_DIR, track.filename)).catch(() => null)
  if (!bytes) throw notFound()
  return { bytes: new Uint8Array(bytes), mime: "audio/mpeg" }
}

/**
 * Giải mã nhạc cho payload worker: bài hệ thống → `{ musicTrackId }`; bài tiệm
 * → `{ musicStorageKey }` (đã kiểm thuộc đúng tổ chức). Mã lạ → 422.
 */
export async function resolveMusicForJob(
  ctx: TenantContext,
  trackId: string
): Promise<{ musicTrackId: string | null; musicStorageKey: string | null; title: string; mood: string; licenseVerified: boolean }> {
  if (isOrgTrackId(trackId)) {
    const row = await getMusicTrackRepository().findById(ctx, orgTrackUuid(trackId))
    if (!row) throw unprocessable("Bài nhạc không thuộc thư viện của tiệm", { musicTrackId: "Không tìm thấy bài nhạc này trong thư viện của tiệm" })
    return { musicTrackId: null, musicStorageKey: row.storage_key, title: row.title, mood: row.mood, licenseVerified: true }
  }
  const t = getMusicTrack(trackId)
  if (!t) throw unprocessable("Mã bài nhạc lạ", { musicTrackId: "Mã bài nhạc không có trong thư viện" })
  return { musicTrackId: t.trackId, musicStorageKey: null, title: t.displayName, mood: t.mood, licenseVerified: t.licenseVerified }
}
