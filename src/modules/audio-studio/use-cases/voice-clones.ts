/**
 * Voice Clone — nhân bản giọng chủ tiệm (quyết định PO 24/09/2026: xây thật
 * với ElevenLabs Instant Voice Clone).
 *
 * Luồng: tải mẫu giọng + tick cam kết → lưu mẫu vào kho → job
 * `audio.voice_clone` (5 credit, giá tạm #64) → worker gửi mẫu lên ElevenLabs,
 * ghi `provider_voice_id` → giọng `READY` dùng được ở tác vụ VOICE_CLONE.
 * Hỏng → `FAILED` + tự hoàn credit ở lần đọc kế tiếp.
 */

import { randomUUID } from "node:crypto"

import { AppError, notFound, validationFailed } from "@/core/http/errors"
import { log } from "@/core/observability/log"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { refundJob } from "@/modules/usage/use-cases/refund-job"
import {
  VOICE_CLONE_CONSENT_TEXT,
  VOICE_SAMPLE_MAX_BYTES,
  VOICE_SAMPLE_MIN_BYTES,
  sniffAudioExtension,
} from "../domain/audio-task-rules"
import { getVoiceCloneRepository } from "../infra/voice-clone-repository"
import type { IVoiceCloneRepository, VoiceCloneData } from "../domain/repositories/voice-clone-repository.interface"


export const VOICE_CLONE_FEATURE = "audio.voice_clone"

const MIME_BY_EXT = { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4" } as const

export interface VoiceCloneView {
  readonly id: string
  readonly name: string
  readonly status: "PENDING" | "READY" | "FAILED" | "DELETED"
  readonly provider: string
  readonly error: string | null
  readonly job_id: string | null
  readonly sample_url: string | null
  readonly consented_at: Date
  readonly created_at: Date
}

async function toView(row: VoiceCloneData, withSample: boolean): Promise<VoiceCloneView> {
  return {
    id: row.id,
    name: row.name,
    status: row.status as VoiceCloneView["status"],
    provider: row.provider,
    error: row.error,
    job_id: row.job_id,
    sample_url: withSample ? await getStorageProvider().signedUrl(row.sample_storage_key, 3600) : null,
    consented_at: row.consented_at,
    created_at: row.created_at,
  }
}

export async function createVoiceClone(
  ctx: TenantContext,
  input: { name: string; sample: Uint8Array; consent: boolean; idempotencyKey: string }
) {
  requireCapability(ctx, "I1")
  const name = input.name.trim()
  if (name.length < 2 || name.length > 60) throw validationFailed({ name: "Tên giọng 2–60 ký tự" })
  if (!input.consent) throw validationFailed({ consent: "Phải xác nhận quyền sử dụng giọng trước khi nhân bản" })
  if (input.sample.byteLength < VOICE_SAMPLE_MIN_BYTES || input.sample.byteLength > VOICE_SAMPLE_MAX_BYTES) {
    throw validationFailed({ sample: "Tệp mẫu 50KB–10MB (nên 1–3 phút nói rõ, không nhạc nền)" })
  }
  const ext = sniffAudioExtension(input.sample)
  if (!ext) throw validationFailed({ sample: "Chỉ nhận MP3, WAV hoặc M4A" })

  const id = randomUUID()
  const storageKey = `org/${ctx.organizationId}/audio/voice-samples/${id}.${ext}`
  await getStorageProvider().put(storageKey, input.sample, MIME_BY_EXT[ext])

  const repo = getVoiceCloneRepository()
  await repo.create(ctx, {
    id,
    name,
    sampleStorageKey: storageKey,
    sampleMimeType: MIME_BY_EXT[ext],
    sampleBytes: input.sample.byteLength,
    consentText: VOICE_CLONE_CONSENT_TEXT,
  })

  try {
    const enqueued = await enqueueJob(ctx, {
      feature: VOICE_CLONE_FEATURE,
      idempotencyKey: input.idempotencyKey,
      payload: { voiceCloneId: id, name, sampleStorageKey: storageKey, sampleMimeType: MIME_BY_EXT[ext] },
    })
    await repo.setJob(ctx, id, enqueued.job.id)
    const row = await repo.findById(ctx, id)
    return {
      voice_clone: row ? await toView(row, false) : null,
      job_id: enqueued.job.id,
      usage: enqueued.usage,
      deduped: enqueued.deduped,
    }
  } catch (err) {
    // Không đủ credit / trần vận hành: không để lại một giọng PENDING mồ côi.
    await repo.markDeleted(ctx, id)
    throw err
  }
}

/** Giọng hỏng thì hoàn credit (idempotent — `refundJob` tự chặn hoàn hai lần). */
async function refundIfFailed(ctx: TenantContext, row: VoiceCloneData): Promise<void> {
  if (row.status !== "FAILED" || !row.job_id) return
  await refundJob(ctx, row.job_id).catch((err: unknown) =>
    log.warn("voice_clone.refund_failed", { job_id: row.job_id, error: String(err) })
  )
}

export async function listVoiceClones(ctx: TenantContext): Promise<VoiceCloneView[]> {
  requireCapability(ctx, "I1")
  const rows = await getVoiceCloneRepository().list(ctx)
  await Promise.all(rows.map((r) => refundIfFailed(ctx, r)))
  return Promise.all(rows.map((r) => toView(r, false)))
}

export async function getVoiceClone(ctx: TenantContext, id: string): Promise<VoiceCloneView> {
  requireCapability(ctx, "I1")
  const row = await getVoiceCloneRepository().findById(ctx, id)
  if (!row) throw notFound()
  await refundIfFailed(ctx, row)
  return toView(row, true)
}

/** Giọng READY của tổ chức — dùng khi tạo job VOICE_CLONE. */
export async function requireReadyVoiceClone(ctx: TenantContext, id: string): Promise<VoiceCloneData> {
  const row = await getVoiceCloneRepository().findById(ctx, id)
  if (!row) throw notFound()
  if (row.status !== "READY" || !row.provider_voice_id) {
    throw new AppError("CONFLICT", "Giọng nhân bản chưa sẵn sàng (đang tạo hoặc đã lỗi)")
  }
  return row
}

/**
 * Xoá giọng: gỡ trên ElevenLabs (không để giọng của chủ tiệm nằm lại ở nhà
 * cung cấp) rồi đánh dấu `DELETED`. Mẫu giọng trong kho giữ lại để đối soát
 * cam kết; xoá hẳn theo quy trình xoá dữ liệu tổ chức.
 */
export async function deleteVoiceClone(ctx: TenantContext, id: string): Promise<{ provider_deleted: boolean }> {
  requireCapability(ctx, "I1")
  const repo = getVoiceCloneRepository()
  const row = await repo.findById(ctx, id)
  if (!row) throw notFound()

  let providerDeleted = false
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (row.provider_voice_id && apiKey) {
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(row.provider_voice_id)}`, {
        method: "DELETE",
        headers: { "xi-api-key": apiKey },
        signal: AbortSignal.timeout(15_000),
      })
      providerDeleted = res.ok || res.status === 404
      if (!providerDeleted) log.warn("voice_clone.provider_delete_failed", { id, status: res.status })
    } catch (err) {
      log.warn("voice_clone.provider_delete_failed", { id, error: String(err) })
    }
  }
  await repo.markDeleted(ctx, id)
  return { provider_deleted: providerDeleted || !row.provider_voice_id }
}
