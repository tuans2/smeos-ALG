/**
 * IVoiceCloneRepository — Port Interface cho Audio Studio.
 *
 * Đặt tại domain/ để use-cases inject qua interface thay vì
 * import trực tiếp từ infra (Dependency Inversion).
 *
 * domain/ KHÔNG import Prisma hay bất kỳ infra nào.
 */

import type { TenantContext } from "@/core/tenancy"

export interface VoiceCloneData {
  readonly id: string
  readonly name: string
  readonly status: string
  readonly provider: string
  readonly provider_voice_id: string | null
  readonly error: string | null
  readonly job_id: string | null
  readonly sample_storage_key: string
  readonly sample_mime_type: string
  readonly sample_bytes: number
  readonly consent_text: string
  readonly consented_by: string
  readonly consented_at: Date
  readonly deleted_at: Date | null
  readonly created_at: Date
  readonly updated_at: Date
}

export interface CreateVoiceCloneData {
  readonly id: string
  readonly name: string
  readonly sampleStorageKey: string
  readonly sampleMimeType: string
  readonly sampleBytes: number
  readonly consentText: string
}

export interface IVoiceCloneRepository {
  create(ctx: TenantContext, data: CreateVoiceCloneData): Promise<VoiceCloneData>
  setJob(ctx: TenantContext, id: string, jobId: string): Promise<void>
  findById(ctx: TenantContext, id: string): Promise<VoiceCloneData | null>
  list(ctx: TenantContext): Promise<VoiceCloneData[]>
  markDeleted(ctx: TenantContext, id: string): Promise<void>
}
