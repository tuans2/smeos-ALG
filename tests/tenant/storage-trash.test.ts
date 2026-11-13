import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listTrashRoute, POST as moveTrashRoute } from "@/app/api/v1/storage/trash/route"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const URL_TRASH = "http://localhost/api/v1/storage/trash"

describe("Kho dữ liệu — chuyển ảnh gốc vào thùng rác", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function seedOriginal(ctx: TenantContext, metadata?: unknown): Promise<string> {
    const id = randomUUID()
    await new AssetRepository().create(ctx, {
      id,
      productId: null,
      parentAssetId: null,
      kind: "ORIGINAL",
      version: 1,
      storageKey: `org/${ctx.organizationId}/unfiled/${id}.jpg`,
      mimeType: "image/jpeg",
      createdBy: ctx.userId,
    })
    if (metadata !== undefined) {
      await prisma.assets.update({ where: { id }, data: { metadata: metadata as never } })
    }
    return id
  }

  function post(t: Tenant, id: string) {
    return moveTrashRoute(
      withSession(URL_TRASH, t.token, { method: "POST", body: JSON.stringify({ id, type: "RAW_ASSET" }) })
    )
  }

  it("chủ tiệm chuyển được ảnh gốc của mình (kể cả ảnh không còn file) vào thùng rác", async () => {
    const id = await seedOriginal(a.ctx)
    const res = await post(a, id)
    expect(res.status, JSON.stringify(await readJson(res.clone()))).toBe(200)
    const row = await prisma.assets.findUnique({ where: { id } })
    expect(row?.state).toBe("ARCHIVED")

    const list = await listTrashRoute(withSession(URL_TRASH, a.token))
    expect(list.status).toBe(200)
  })

  it("ảnh có metadata null vẫn chuyển được", async () => {
    const id = await seedOriginal(a.ctx, null)
    const res = await post(a, id)
    expect(res.status, JSON.stringify(await readJson(res.clone()))).toBe(200)
  })

  it("ảnh của tiệm khác → 404", async () => {
    const id = await seedOriginal(b.ctx)
    const res = await post(a, id)
    expect(res.status).toBe(404)
  })
})
