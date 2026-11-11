import { randomUUID } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { findAssetUsages } from "@/modules/assets/infra/asset-usage-guard"
import { countPayloadReferences } from "@/modules/assets/infra/payload-references"
import { countLibraryRows, listLibraryRows } from "@/modules/storage/infra/library-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Cách ly tenant cho 4 bảng của Creative Studio mà phần giao GD1 chỉ ĐỌC (đặc tả 07 mục 19):
 * music_tracks, voice_clones (thư viện tệp), campaign_packages, content_drafts (kiểm tệp đang dùng trước khi xoá).
 * Bản giao không có route ghi các bảng này; test ghi thẳng bằng Prisma rồi đọc qua đường của bản giao.
 */
describe("cách ly tenant — bảng Creative Studio chỉ được đọc trong bản giao", () => {
  let a: Tenant
  let b: Tenant
  const query = { creator: { kind: "none" as const }, q: null, from: null, cursor: null, take: 20 }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function seedAudio(t: Tenant, key: string): Promise<void> {
    const now = new Date()
    await prisma.music_tracks.create({
      data: {
        organization_id: t.organizationId, title: "Nhạc nền A", mood: "vui", storage_key: key, mime_type: "audio/mpeg",
        file_bytes: 10, license_type: "OWNED", license_source: "tự sáng tác", attested_by: t.userId, attested_at: now,
      },
    })
    await prisma.voice_clones.create({
      data: {
        organization_id: t.organizationId, name: "Giọng A", sample_storage_key: `${key}-voice`, sample_mime_type: "audio/mpeg",
        sample_bytes: 10, consent_text: "đồng ý", consented_by: t.userId, consented_at: now,
      },
    })
  }

  it("music_tracks / voice_clones: thư viện và tham chiếu kho của B không thấy tệp của A", async () => {
    const key = `org/${a.organizationId}/audio/${randomUUID()}.mp3`
    await seedAudio(a, key)

    expect(await listLibraryRows(a.ctx, "audio", query)).toHaveLength(2)
    expect(await listLibraryRows(b.ctx, "audio", query)).toEqual([])
    expect(await countLibraryRows(b.ctx, "audio", query)).toBe(0)

    expect(await countPayloadReferences(a.ctx, key)).toBe(1)
    expect(await countPayloadReferences(b.ctx, key)).toBe(0)
  })

  it("campaign_packages / content_drafts: kiểm tệp đang dùng của B không thấy gói và bản nháp của A", async () => {
    const assetId = randomUUID()
    await prisma.campaign_packages.create({
      data: { organization_id: a.organizationId, master_asset_id: assetId, name: "Gói A", mode: "CREATIVE", created_by: a.userId },
    })
    await prisma.content_drafts.create({
      data: {
        organization_id: a.organizationId, asset_id: assetId, topic_id: randomUUID(), mode: "CREATIVE", posts: [],
        created_by: a.userId, updated_by: a.userId,
      },
    })

    expect(await findAssetUsages(a.ctx, assetId)).toEqual(expect.arrayContaining(["campaign", "content"]))
    expect(await findAssetUsages(b.ctx, assetId)).toEqual([])
  })
})
