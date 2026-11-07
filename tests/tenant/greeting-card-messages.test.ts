import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { getThread, markMessagesRead, sendMessage } from "@/modules/greeting-card/use-cases/internal-messages"
import { getInbox } from "@/modules/greeting-card/use-cases/get-inbox"
import { decideDiscount, requestDiscount } from "@/modules/greeting-card/use-cases/discount-requests"

/** Tin nhắn nội bộ + Hộp việc (06/10/2026): đúng người nhận, trả lời đúng người, cách ly tổ chức. */

const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-discount-10",
  deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10), deliveryAddress: "1 Lê Lợi, Q1",
}

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: tin nhắn nội bộ và Hộp việc", () => {
  let a: Tenant
  let b: Tenant
  let lan: TenantContext
  let owner: TenantContext

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    const saleRole = await new RoleRepository().findSystemRoleByKey("sale")
    const user = await prisma.users.create({ data: { id: randomUUID(), email: `lan-${randomUUID()}@vi-du.test`, name: "Lan" } })
    await prisma.memberships.create({ data: { id: randomUUID(), organization_id: a.organizationId, user_id: user.id, role_id: saleRole!.id, status: "ACTIVE", joined_at: new Date() } })
    lan = { ...a.ctx, userId: user.id, capabilities: new Set(["R1", "R2", "R9"]) }
    // Chủ tiệm (vai dieu_hanh): fixture để trống năng lực, gán bộ của Điều hành
    owner = { ...a.ctx, capabilities: new Set(["R1", "R2", "R4", "R9", "F2"]) }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function lanOrder() {
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-M", name: "Bó M", attributes: { price: 500000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-m", name: "Bộ M", productIds: [product.id], createdBy: a.userId })
    const link = await createSendLink(lan, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    return submitBrochureOrder(link.sendCode, ORDER)
  }

  it("sale gửi Điều hành → Điều hành thấy trong Hộp việc; trả lời về đúng sale, đúng đơn", async () => {
    const order = await lanOrder()
    const sent = await sendMessage(lan, { orderId: order.orderId, stepKey: "STEP_4_PAYMENT_PENDING", to: { kind: "ROLE", role: "ADMIN" }, body: "Xin giảm 10% cho khách quen" })
    const row = await prisma.greeting_messages.findUniqueOrThrow({ where: { id: sent.id } })
    // Vai người gửi suy từ năng lực, không do client khai
    expect(row).toMatchObject({ sender_role: "SALE", to_role: "ADMIN", sender_id: lan.userId, order_id: order.orderId })

    const ownerInbox = await getInbox(owner)
    expect(ownerInbox.role).toBe("ADMIN")
    expect(ownerInbox.counts.unreadMessages).toBe(1)
    expect(ownerInbox.threads[0]).toMatchObject({ orderId: order.orderId, unread: 1, lastBody: "Xin giảm 10% cho khách quen" })
    // Người gửi không tự nhận thông báo của mình
    expect((await getInbox(lan)).counts.unreadMessages).toBe(0)

    const reply = await sendMessage(owner, { orderId: order.orderId, stepKey: "GENERAL", to: { kind: "ROLE", role: "COORDINATOR" }, body: "Duyệt 5% thôi", replyToId: sent.id })
    expect(await prisma.greeting_messages.findUniqueOrThrow({ where: { id: reply.id } })).toMatchObject({ to_user_id: lan.userId, to_role: null })
    const lanInbox = await getInbox(lan)
    expect(lanInbox.threads[0]).toMatchObject({ orderId: order.orderId, unread: 1, lastBody: "Duyệt 5% thôi" })

    await markMessagesRead(owner, ownerInbox.threads[0]!.unreadIds)
    expect((await getInbox(owner)).counts.unreadMessages).toBe(0)
    const thread = await getThread(lan, { orderId: order.orderId })
    expect(thread.messages.map((m) => [m.body, m.mine])).toEqual([["Xin giảm 10% cho khách quen", true], ["Duyệt 5% thôi", false]])
    expect(thread.messages[1]).toMatchObject({ unread: true, senderRoleLabel: "Điều hành", toLabel: "Lan" })
  })

  it("tổ chức khác không đọc, không gửi, không đánh dấu được (404 / 0)", async () => {
    const order = await lanOrder()
    const sent = await sendMessage(lan, { orderId: order.orderId, stepKey: "GENERAL", to: { kind: "ROLE", role: "ADMIN" }, body: "Chào" })
    expect(await codeOf(getThread(b.ctx, { orderId: order.orderId }))).toBe("NOT_FOUND")
    expect(await codeOf(sendMessage(b.ctx, { orderId: order.orderId, stepKey: "GENERAL", to: { kind: "ROLE", role: "ADMIN" }, body: "x" }))).toBe("NOT_FOUND")
    expect(await codeOf(sendMessage(a.ctx, { orderId: order.orderId, stepKey: "GENERAL", to: { kind: "USER", userId: b.userId }, body: "x" }))).toBe("NOT_FOUND")
    expect((await markMessagesRead(b.ctx, [sent.id])).marked).toBe(0)
    expect(await prisma.greeting_message_reads.count({ where: { organization_id: b.organizationId } })).toBe(0)
    expect((await getInbox(b.ctx)).counts.unreadMessages).toBe(0)
  })

  it("sale chế độ 'chỉ khách của mình' không mở được trao đổi đơn của người khác", async () => {
    const order = await lanOrder()
    const minh = { ...lan, userId: randomUUID() }
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { brochure_visibility: { mode: "OWN", members: {} } } } })
    expect(await codeOf(getThread(minh, { orderId: order.orderId }))).toBe("NOT_FOUND")
    expect((await getThread(lan, { orderId: order.orderId })).label).toContain("Đơn")
  })

  it("xin giảm giá: trần 50% mặc định (một trần duy nhất — PO 07/11/2026); Điều hành duyệt mức khác kèm ghi chú → giá chốt cập nhật, sale nhận kết quả", async () => {
    const order = await lanOrder()
    const base = Number((await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })).total_vnd)
    expect(await codeOf(requestDiscount(lan, { orderId: order.orderId, ask: { percent: 60 }, reason: "Khách quen" }))).toBe("VALIDATION_FAILED")
    const req = await requestDiscount(lan, { orderId: order.orderId, ask: { percent: 10 }, reason: "Khách quen đặt lần 3" })
    expect(await codeOf(requestDiscount(lan, { orderId: order.orderId, ask: { percent: 5 }, reason: "Lần nữa" }))).toBe("CONFLICT")

    const action = (await getInbox(owner)).actions.find((x) => x.kind === "DISCOUNT")
    expect(action?.discount).toMatchObject({ requestId: req.id, requester: "Lan", percent: 10, maxPercent: 50 })

    // Tổ chức khác không duyệt được; từ chối phải có lý do
    expect(await codeOf(decideDiscount({ ...b.ctx, capabilities: new Set(["F2"]) }, { requestId: req.id, approve: true, note: "" }))).toBe("NOT_FOUND")
    expect(await codeOf(decideDiscount(owner, { requestId: req.id, approve: false, note: "" }))).toBe("VALIDATION_FAILED")

    const decided = await decideDiscount(owner, { requestId: req.id, approve: true, ask: { percent: 5 }, note: "Duyệt 5% thay vì 10%" })
    const expectedOff = Math.floor((base * 5) / 100 / 1000) * 1000
    expect(decided).toMatchObject({ status: "APPROVED", totalVnd: base - expectedOff })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })
    expect(Number(row.balance_vnd)).toBe(base - expectedOff)
    expect(row.pricing_rule_ref).toMatchObject({ manualDiscount: { baseTotalVnd: base, vnd: expectedOff, percent: 5, note: "Duyệt 5% thay vì 10%" } })
    expect(await codeOf(decideDiscount(owner, { requestId: req.id, approve: true, note: "" }))).toBe("CONFLICT")

    const lanInbox = await getInbox(lan)
    expect(lanInbox.threads[0]).toMatchObject({ orderId: order.orderId, unread: 1, lastBody: "Duyệt 5% thay vì 10%" })
    expect((await getInbox(owner)).actions.some((x) => x.kind === "DISCOUNT")).toBe(false)
    expect(await prisma.audit_logs.count({ where: { organization_id: a.organizationId, action: "greeting_card.discount.approve" } })).toBe(1)
  })

  it("Điều hành hạ trần trong Cài đặt → sale không xin vượt được", async () => {
    const order = await lanOrder()
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { brochure_discount: { max_percent: 10 } } } })
    expect(await codeOf(requestDiscount(lan, { orderId: order.orderId, ask: { percent: 15 }, reason: "Khách quen" }))).toBe("VALIDATION_FAILED")
    expect((await requestDiscount(lan, { orderId: order.orderId, ask: { percent: 10 }, reason: "Khách quen" })).id).toBeTruthy()
  })
})
