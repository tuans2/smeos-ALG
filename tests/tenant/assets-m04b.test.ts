import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listAssetsRoute } from "@/app/api/v1/assets/route"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

describe("cách ly tenant — Assets & M04b Creative Marketing", () => {
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

  async function seedAsset(
    ctx: TenantContext,
    options: {
      kind?: "ORIGINAL" | "MASTER" | "MARKETING"
      approvalState?: "PENDING" | "APPROVED" | "REJECTED"
      parentAssetId?: string | null
    } = {}
  ): Promise<string> {
    const id = randomUUID()
    const asset = await new AssetRepository().create(ctx, {
      id,
      productId: null,
      parentAssetId: options.parentAssetId ?? null,
      kind: options.kind ?? "MARKETING",
      version: 1,
      storageKey: `org/${ctx.organizationId}/unfiled/${id}.png`,
      mimeType: "image/png",
      createdBy: ctx.userId,
    })

    if (options.approvalState && options.approvalState !== "PENDING") {
      await prisma.assets.update({
        where: { id: asset.id },
        data: {
          approval_state: options.approvalState,
          approved_by: options.approvalState === "APPROVED" ? ctx.userId : null,
          approved_at: options.approvalState === "APPROVED" ? new Date() : null,
        },
      })
    }

    return asset.id
  }

  describe("GET /api/v1/assets", () => {
    it("lọc theo approval_state=APPROVED và cách ly giữa hai tổ chức", async () => {
      const aApprovedId = await seedAsset(a.ctx, { kind: "MASTER", approvalState: "APPROVED" })
      const aPendingId = await seedAsset(a.ctx, { kind: "MARKETING", approvalState: "PENDING" })
      await seedAsset(b.ctx, { kind: "MASTER", approvalState: "APPROVED" })

      // Tenant A đọc danh sách approved
      const resA = await listAssetsRoute(
        withSession(`${BASE}/assets?approval_state=APPROVED`, a.token)
      )
      expect(resA.status).toBe(200)
      const dataA = (await readJson(resA)) as { data: Array<{ id: string }> }
      expect(dataA.data.map((x) => x.id)).toContain(aApprovedId)
      expect(dataA.data.map((x) => x.id)).not.toContain(aPendingId)

      // Tenant B đọc danh sách approved chỉ thấy của B
      const resB = await listAssetsRoute(
        withSession(`${BASE}/assets?approval_state=APPROVED`, b.token)
      )
      expect(resB.status).toBe(200)
      const dataB = (await readJson(resB)) as { data: Array<{ id: string }> }
      expect(dataB.data.map((x) => x.id)).not.toContain(aApprovedId)
    })
  })

})
