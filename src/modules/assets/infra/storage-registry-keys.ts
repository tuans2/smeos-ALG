import { prisma } from "@/core/tenancy/infra/prisma"
import { storageKeyFromReference } from "@/modules/assets/domain/storage-reconciliation"

const PAGE = 5000
/** Trần an toàn số trang mỗi bảng — vòng lặp luôn có giới hạn. */
const MAX_PAGES = 400

async function paged<T extends { id: string }>(fetch: (cursor: string | undefined) => Promise<T[]>): Promise<T[]> {
  const all: T[] = []
  let cursor: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const rows = await fetch(cursor)
    all.push(...rows)
    if (rows.length < PAGE) return all
    cursor = rows[rows.length - 1]!.id
  }
  throw new Error("Vượt trần trang khi đọc registry — tăng MAX_PAGES có chủ đích")
}

const pageArgs = (cursor: string | undefined) => ({
  take: PAGE,
  orderBy: { id: "asc" as const },
  ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
})

/**
 * SSOT các nơi trỏ tới tệp trên kho (SDAGF-002/022). Thêm nơi ghi tệp mới
 * thì thêm nguồn ở đây VÀ ở `countPayloadReferences` (`payload-references.ts`);
 * test kiến trúc `storage-write-contract.test.ts` giữ danh sách nơi ghi.
 */
export const STORAGE_REFERENCE_SOURCES = [
  "assets.storage_key",
  "assets.thumb_key",
  "music_tracks.storage_key",
  "voice_clones.sample_storage_key",
  "video_jobs.audio_storage_key",
  "video_jobs.final_video_url",
  "generation_jobs.output.audio_storage_key",
  "generation_jobs.output.voice_only_storage_key",
  "order_coordinations.metadata.qc_photos",
  "order_coordinations.metadata.pod_photos",
  "partner_marketplace_stores.photo_keys",
  "internal_chat_messages.attachments",
] as const

function stringsAt(json: unknown, field: string): string[] {
  if (!json || typeof json !== "object") return []
  const value = (json as Record<string, unknown>)[field]
  if (typeof value === "string") return [value]
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []
}

/**
 * Mọi khoá kho mà registry đang trỏ tới, của MỌI tổ chức — chỉ script đối
 * soát hệ thống dùng (`scripts/storage-reconcile.ts`), chỉ đọc.
 */
export async function loadRegistryKeys(): Promise<{ registry: Set<string>; pendingDeletes: Set<string> }> {
  const registry = new Set<string>()
  const add = (value: string | null | undefined) => {
    const key = value ? storageKeyFromReference(value) : null
    if (key) registry.add(key)
  }

  const assets = await paged((c) => prisma.assets.findMany({ ...pageArgs(c), select: { id: true, storage_key: true, thumb_key: true } }))
  assets.forEach((r) => (add(r.storage_key), add(r.thumb_key)))
  const tracks = await paged((c) => prisma.music_tracks.findMany({ ...pageArgs(c), select: { id: true, storage_key: true } }))
  tracks.forEach((r) => add(r.storage_key))
  const voices = await paged((c) => prisma.voice_clones.findMany({ ...pageArgs(c), select: { id: true, sample_storage_key: true } }))
  voices.forEach((r) => add(r.sample_storage_key))
  const videos = await paged((c) =>
    prisma.video_jobs.findMany({ ...pageArgs(c), select: { id: true, audio_storage_key: true, final_video_url: true } })
  )
  videos.forEach((r) => (add(r.audio_storage_key), add(r.final_video_url)))
  const jobs = await paged((c) =>
    prisma.generation_jobs.findMany({ ...pageArgs(c), select: { id: true, output: true } })
  )
  jobs.forEach((r) => [...stringsAt(r.output, "audio_storage_key"), ...stringsAt(r.output, "voice_only_storage_key")].forEach(add))
  const coordinations = await paged((c) =>
    prisma.order_coordinations.findMany({ ...pageArgs(c), select: { id: true, metadata: true } })
  )
  coordinations.forEach((r) => [...stringsAt(r.metadata, "qc_photos"), ...stringsAt(r.metadata, "pod_photos")].forEach(add))

  const partners = await paged((c) =>
    prisma.partner_marketplace_stores.findMany({ ...pageArgs(c), select: { id: true, photo_keys: true } })
  )
  partners.forEach((r) => r.photo_keys.forEach(add))
  // Ảnh trong tin nhắn trao đổi nội bộ (kế hoạch chat nội bộ GĐ8) — khoá `org/<tổ chức chủ phòng>/chat-<phòng>/…`
  const chatImages = await paged((c) =>
    prisma.internal_chat_messages.findMany({ ...pageArgs(c), where: { message_type: "IMAGE" }, select: { id: true, attachments: true } })
  )
  chatImages.forEach((r) => r.attachments.forEach(add))
  const pending = await prisma.storage_outbox.findMany({ where: { done_at: null }, select: { storage_key: true } })
  return { registry, pendingDeletes: new Set(pending.map((r) => r.storage_key)) }
}
