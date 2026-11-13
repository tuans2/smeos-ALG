/**
 * VoiceCloneRepository — Infra layer cho Audio Studio.
 * Bảng `voice_clones` (TENANT, 24/09/2026).
 *
 * Worker `audio.voice_clone` ghi `status`/`provider_voice_id`/`error` bằng SQL
 * trực tiếp (lọc theo `organization_id` của dòng job).
 *
 * Interface IVoiceCloneRepository nằm tại domain/repositories/voice-clone-repository.interface.ts
 */

import type { Prisma, PrismaClient, voice_clones } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import type {
  IVoiceCloneRepository,
  VoiceCloneData,
  CreateVoiceCloneData,
} from "../domain/repositories/voice-clone-repository.interface"

type DbClient = PrismaClient | Prisma.TransactionClient

export type { voice_clones }
export type { IVoiceCloneRepository }

// ============================================================
// IMPLEMENTATION
// ============================================================

export class VoiceCloneRepository implements IVoiceCloneRepository {
  constructor(private readonly db: DbClient = prisma) {}

  create(ctx: TenantContext, data: CreateVoiceCloneData): Promise<VoiceCloneData> {
    return this.db.voice_clones.create({
      data: scopedData(ctx, {
        id: data.id,
        name: data.name,
        provider: "elevenlabs",
        status: "PENDING",
        sample_storage_key: data.sampleStorageKey,
        sample_mime_type: data.sampleMimeType,
        sample_bytes: data.sampleBytes,
        consent_text: data.consentText,
        consented_by: ctx.userId,
        consented_at: new Date(),
      }),
    }) as Promise<VoiceCloneData>
  }

  async setJob(ctx: TenantContext, id: string, jobId: string): Promise<void> {
    await this.db.voice_clones.updateMany({ where: scopedWhere(ctx, { id }), data: { job_id: jobId } })
  }

  findById(ctx: TenantContext, id: string): Promise<VoiceCloneData | null> {
    return this.db.voice_clones.findFirst({
      where: scopedWhere(ctx, { id, deleted_at: null }),
    }) as Promise<VoiceCloneData | null>
  }

  list(ctx: TenantContext): Promise<VoiceCloneData[]> {
    return this.db.voice_clones.findMany({
      where: scopedWhere(ctx, { deleted_at: null }),
      orderBy: { created_at: "desc" },
      take: 50,
    }) as Promise<VoiceCloneData[]>
  }

  async markDeleted(ctx: TenantContext, id: string): Promise<void> {
    await this.db.voice_clones.updateMany({
      where: scopedWhere(ctx, { id }),
      data: { status: "DELETED", deleted_at: new Date() },
    })
  }
}

// ============================================================
// SINGLETON FACTORY
// ============================================================

let _instance: VoiceCloneRepository | undefined

/** Trả về singleton VoiceCloneRepository (inject mặc định cho use-cases). */
export function getVoiceCloneRepository(): IVoiceCloneRepository {
  _instance ??= new VoiceCloneRepository()
  return _instance
}
