import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { createSendLink, revokeSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { proposeDismissal } from "@/modules/greeting-card/use-cases/propose-dismissal"

/** Sale "chỉ khách của mình" không thu hồi / đề xuất bỏ link của sale khác — 404 (rà soát quyền Sale 16/10/2026). */

const REASON = { reasonId: "CHANGED_MIND", reasonText: "Khách đổi ý không mua nữa" }

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: thao tác trên link theo phạm vi xem của Sale", () => {
  let a: Tenant
  let lan: TenantContext
  let mai: TenantContext

  async function sale(name: string): Promise<TenantContext> {
    const saleRole = await new RoleRepository().findSystemRoleByKey("sale")
    const user = await prisma.users.create({ data: { id: randomUUID(), email: `${name}-${randomUUID()}@vi-du.test`, name } })
    await prisma.memberships.create({ data: { id: randomUUID(), organization_id: a.organizationId, user_id: user.id, role_id: saleRole!.id, status: "ACTIVE", joined_at: new Date() } })
    return { ...a.ctx, userId: user.id, capabilities: new Set(["R1", "R2", "R9"]) }
  }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    lan = await sale("lan")
    mai = await sale("mai")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function linkOf(seller: TenantContext) {
    const product = await new ProductRepository().create(a.ctx, { code: `HOA-${randomUUID().slice(0, 4)}`, name: "Bó hoa", attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: `bo-${randomUUID().slice(0, 6)}`, name: "Bộ", productIds: [product.id], createdBy: a.userId })
    return createSendLink(seller, { catalogId: catalog.id })
  }

  const ownMode = () =>
    prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { brochure_visibility: { mode: "OWN", members: {} } } } })

  it("chế độ 'chỉ khách của mình': không thu hồi được link của sale khác (404), link của mình thì được", async () => {
    const maiLink = await linkOf(mai)
    const lanLink = await linkOf(lan)
    await ownMode()
    expect(await codeOf(revokeSendLink(lan, maiLink.sessionId))).toBe("NOT_FOUND")
    expect((await prisma.greeting_sessions.findUniqueOrThrow({ where: { id: maiLink.sessionId } })).revoked_at).toBeNull()
    expect(await revokeSendLink(lan, lanLink.sessionId)).toEqual({ revoked: true })
  })

  it("chế độ 'chỉ khách của mình': không đề xuất bỏ hiển thị link của sale khác (404)", async () => {
    const maiLink = await linkOf(mai)
    await ownMode()
    expect(await codeOf(proposeDismissal(lan, { id: maiLink.sessionId, type: "SESSION", ...REASON }))).toBe("NOT_FOUND")
    const lanLink = await linkOf(lan)
    await expect(proposeDismissal(lan, { id: lanLink.sessionId, type: "SESSION", ...REASON })).resolves.toBeTruthy()
  })

  it("chế độ xem tất cả (mặc định): sale vẫn thu hồi được link của người khác như trước", async () => {
    const maiLink = await linkOf(mai)
    expect(await revokeSendLink(lan, maiLink.sessionId)).toEqual({ revoked: true })
  })
})
