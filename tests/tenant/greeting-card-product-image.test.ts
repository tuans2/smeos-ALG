import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import { TrackingPipelineRepository } from "@/modules/greeting-card/infra/tracking-pipeline-repository"
import { getTrackingPipeline } from "@/modules/greeting-card/use-cases/get-tracking-pipeline"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Đơn Thẻ chào luôn có ảnh mẫu: ảnh chụp lúc chọn thiếu thì lấy ảnh hiện tại trong kho (15/10/2026). */
describe("greeting-card: ảnh mẫu hoa trên đơn", () => {
  let a: Tenant
  let b: Tenant
  let owner: TenantContext

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    owner = { ...a.ctx, capabilities: new Set(["R1", "R2", "R4", "R6", "R9", "R10", "F2"]) }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function product(t: Tenant, imageUrl: string) {
    const id = randomUUID()
    await prisma.products.create({
      data: { id, organization_id: t.organizationId, code: `SP-${id.slice(0, 6)}`, name: "Bo Hoa Rosa 747", status: "ACTIVE", attributes: { imageUrl } },
    })
    return id
  }

  async function order(t: Tenant, productId: string, metadata: { name: string; imageUrl?: string }) {
    const id = randomUUID()
    await prisma.orders.create({
      data: {
        id, organization_id: t.organizationId, code: `DH-${id.slice(0, 6)}`, source: "BROCHURE", status: "CONFIRMED",
        total_vnd: 495_000, paid_vnd: 0, balance_vnd: 495_000, created_by: t.userId,
        items: { create: { organization_id: t.organizationId, product_id: productId, unit_price_vnd: 495_000, metadata } },
      },
    })
    return id
  }

  it("ảnh chụp mẫu thiếu ảnh → hiện ảnh sản phẩm trong kho", async () => {
    const productId = await product(a, "/img/rosa-747.jpg")
    const orderId = await order(a, productId, { name: "Bo Hoa Rosa 747" })
    const item = (await getTrackingPipeline(owner)).find((i) => i.orderId === orderId)
    expect(item?.productImageUrl).toBe("/img/rosa-747.jpg")
  })

  it("ảnh chụp mẫu có sẵn thì giữ nguyên", async () => {
    const productId = await product(a, "/img/kho.jpg")
    const orderId = await order(a, productId, { name: "Bo Hoa Rosa 747", imageUrl: "/img/luc-chon.jpg" })
    const item = (await getTrackingPipeline(owner)).find((i) => i.orderId === orderId)
    expect(item?.productImageUrl).toBe("/img/luc-chon.jpg")
  })

  it("không đọc được ảnh sản phẩm của tổ chức khác", async () => {
    const productId = await product(a, "/img/rosa-747.jpg")
    const images = await new TrackingPipelineRepository().productMainImages(b.ctx, [productId])
    expect(images.size).toBe(0)
  })
})
