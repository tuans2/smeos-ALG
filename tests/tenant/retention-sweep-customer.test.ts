import { randomUUID } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { runRetentionSweep } from "@/modules/organization/use-cases/run-retention-sweep"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * ADR-014 D-P4, bước P-6b (PO 12/11/2026): hội thoại / lead không thành đơn / phiên Thẻ chào không đặt (3 tháng, ẩn
 * danh; hội thoại xoá tin nhắn, giữ vỏ), hồ sơ khách không hoạt động 24 tháng (ẩn danh, kể cả khách có đơn đã thu —
 * đơn giữ nguyên), báo giá và đơn huỷ chưa thu 5 năm (xoá). Dòng còn hạn và tổ chức đang legal hold giữ nguyên.
 */
const DAY = 24 * 60 * 60 * 1000
const NOW = new Date()
const ago = (days: number) => new Date(NOW.getTime() - days * DAY)
const POLICIES = [
  { category: "customer_conversations", retention_months: 3, action: "ANONYMIZE" as const },
  { category: "customer_profiles", retention_months: 24, action: "ANONYMIZE" as const },
  { category: "non_ledger_documents", retention_months: 60, action: "DELETE" as const },
]

async function usePolicies(enforce: boolean) {
  await prisma.retention_policies.deleteMany({})
  await prisma.retention_policies.createMany({ data: POLICIES.map((p) => ({ ...p, enforce })) })
}

const touch = (table: string, column: string, id: string, at: Date) =>
  prisma.$executeRawUnsafe(`UPDATE "${table}" SET "${column}" = $1 WHERE id = $2`, at, id)

async function seed(t: Tenant, tag: string, phoneBase: number) {
  const org = t.organizationId
  const phone = (n: number) => `0100${String(phoneBase + n).padStart(6, "0")}`
  const customer = async (n: number, days: number) => {
    const c = await prisma.customers.create({ data: { organization_id: org, code: `KH${n}-${tag}`, name: `Chị Lan ${n}`, phone: phone(n), notes: "thích hồng" } })
    await touch("customers", "created_at", c.id, ago(days))
    await touch("customers", "updated_at", c.id, ago(days))
    return c.id
  }
  const order = async (code: string, customerId: string | null, status: "COMPLETED" | "CANCELLED", paid: number, days: number) => {
    const o = await prisma.orders.create({
      data: { organization_id: org, code: `${code}-${tag}`, customer_id: customerId, status, total_vnd: 100_000, paid_vnd: paid, balance_vnd: 100_000 - paid, created_by: t.userId },
    })
    await prisma.order_events.create({ data: { organization_id: org, order_id: o.id, axis: "status", to_value: status } })
    await touch("orders", "created_at", o.id, ago(days))
    await touch("orders", "updated_at", o.id, ago(days))
    return o.id
  }

  const dormant = await customer(1, 900)
  const paidOrder = await order("DH1", dormant, "COMPLETED", 100_000, 900)
  await prisma.customer_occasions.create({ data: { organization_id: org, customer_id: dormant, name: "Sinh nhật mẹ", date: "05-12", recipient_name: "Mẹ" } })
  const active = await customer(2, 900)
  await order("DH2", active, "COMPLETED", 100_000, 30)

  const conversation = async (days: number) => {
    const c = await prisma.chat_conversations.create({ data: { organization_id: org, customer_id: active } })
    const m = await prisma.chat_messages.create({ data: { organization_id: org, conversation_id: c.id, sender_type: "USER", content: "Cho em bó hồng" } })
    await touch("chat_messages", "created_at", m.id, ago(days))
    await touch("chat_conversations", "updated_at", c.id, ago(days))
    return c.id
  }
  const lead = async (status: string, days: number) => {
    const l = await prisma.leads.create({
      data: { organization_id: org, name: "Anh Minh", phone: phone(10 + days), message: "giao chiều", source: "MANUAL", status, consent_at: ago(days), consent_version: "v1" },
    })
    await touch("leads", "updated_at", l.id, ago(days))
    return l.id
  }
  const catalog = await prisma.greeting_catalogs.create({ data: { organization_id: org, code: `bst-${tag}`, name: "Bộ", created_by: t.userId } })
  const session = async (status: string, days: number) => {
    const s = await prisma.greeting_sessions.create({
      data: { organization_id: org, catalog_id: catalog.id, send_code: `s-${randomUUID().slice(0, 8)}`, sale_id: t.userId, status, customer_name: "Bà Hoa", customer_phone: phone(50 + days) } as never,
    })
    await touch("greeting_sessions", "last_active_at", s.id, ago(days))
    return s.id
  }
  const quotation = async (days: number) => {
    const q = await prisma.quotations.create({ data: { organization_id: org, code: `BG-${randomUUID().slice(0, 6)}`, public_token: randomUUID(), status: "SENT", created_by: t.userId } })
    await touch("quotations", "updated_at", q.id, ago(days))
    return q.id
  }

  return {
    dormant, active, paidOrder,
    staleChat: await conversation(200), liveChat: await conversation(10),
    lostLead: await lead("LOST", 200), wonLead: await lead("WON", 200), newLead: await lead("NEW", 10),
    openSession: await session("OPENED", 200), doneSession: await session("COMPLETED", 200),
    oldQuote: await quotation(6 * 365), newQuote: await quotation(30),
    oldCancelled: await order("DH3", null, "CANCELLED", 0, 6 * 365), newCancelled: await order("DH4", null, "CANCELLED", 0, 30),
  }
}

describe("hạn lưu dữ liệu khách", () => {
  let a: Tenant
  let held: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("han-luu-khach-a")
    held = await createTenant("han-luu-khach-giu")
    await prisma.organizations.update({ where: { id: held.organizationId }, data: { legal_hold_until: new Date(NOW.getTime() + 30 * DAY) } })
  })

  afterAll(async () => {
    await usePolicies(false)
    await disconnectDatabase()
  })

  it("chỉ đếm: báo đúng số dòng quá hạn, không đổi dữ liệu", async () => {
    await usePolicies(false)
    const ids = await seed(a, "a", 0)
    await seed(held, "g", 500)

    const rows = Object.fromEntries((await runRetentionSweep(NOW)).map((r) => [r.category, r.tables]))
    expect(rows["customer_conversations"]).toEqual([
      { table: "chat_messages", rows: 1 }, { table: "chat_conversations", rows: 1 }, { table: "leads", rows: 1 }, { table: "greeting_sessions", rows: 1 },
    ])
    expect(rows["customer_profiles"]).toEqual([{ table: "customer_occasions", rows: 1 }, { table: "customers", rows: 1 }])
    expect(rows["non_ledger_documents"]).toEqual([{ table: "quotations", rows: 1 }, { table: "orders", rows: 1 }])
    expect((await prisma.customers.findUniqueOrThrow({ where: { id: ids.dormant } })).name).toBe("Chị Lan 1")
  })

  it("thực thi: ẩn danh / xoá đúng dòng quá hạn; đơn đã thu giữ nguyên; legal hold và dòng còn hạn giữ nguyên", async () => {
    await usePolicies(true)
    const ids = await seed(a, "a", 0)
    const heldIds = await seed(held, "g", 500)

    await runRetentionSweep(NOW)

    // Hội thoại: xoá tin nhắn, giữ vỏ, bỏ liên kết khách
    expect(await prisma.chat_messages.count({ where: { conversation_id: ids.staleChat } })).toBe(0)
    expect(await prisma.chat_conversations.findUniqueOrThrow({ where: { id: ids.staleChat } })).toMatchObject({ customer_id: null })
    expect(await prisma.chat_messages.count({ where: { conversation_id: ids.liveChat } })).toBe(1)
    // Lead không thành đơn ẩn danh; lead đã chốt và lead mới giữ
    expect(await prisma.leads.findUniqueOrThrow({ where: { id: ids.lostLead } })).toMatchObject({ name: "Khách đã xoá", phone: "ERASED", phone_hash: null, message: null })
    for (const id of [ids.wonLead, ids.newLead]) expect((await prisma.leads.findUniqueOrThrow({ where: { id } })).name).toBe("Anh Minh")
    // Phiên Thẻ chào không đặt ẩn danh; phiên đã xong giữ
    expect(await prisma.greeting_sessions.findUniqueOrThrow({ where: { id: ids.openSession } })).toMatchObject({ customer_name: null, customer_phone: null })
    expect((await prisma.greeting_sessions.findUniqueOrThrow({ where: { id: ids.doneSession } })).customer_name).toBe("Bà Hoa")
    // Khách 24 tháng không hoạt động: ẩn danh, ngày kỷ niệm xoá, đơn đã thu còn nguyên; khách còn mua giữ
    expect(await prisma.customers.findUniqueOrThrow({ where: { id: ids.dormant } })).toMatchObject({ name: "Khách đã xoá", phone: "ERASED", notes: null, phone_hash: null })
    expect(await prisma.customer_occasions.count({ where: { customer_id: ids.dormant } })).toBe(0)
    expect(await prisma.orders.findUniqueOrThrow({ where: { id: ids.paidOrder } })).toMatchObject({ customer_id: ids.dormant, paid_vnd: expect.anything() })
    expect(Number((await prisma.orders.findUniqueOrThrow({ where: { id: ids.paidOrder } })).paid_vnd)).toBe(100_000)
    expect((await prisma.customers.findUniqueOrThrow({ where: { id: ids.active } })).name).toBe("Chị Lan 2")
    // Báo giá và đơn huỷ chưa thu quá 5 năm xoá (kèm nhật ký đơn); bản còn hạn giữ
    expect(await prisma.quotations.findUnique({ where: { id: ids.oldQuote } })).toBeNull()
    expect(await prisma.orders.findUnique({ where: { id: ids.oldCancelled } })).toBeNull()
    expect(await prisma.order_events.count({ where: { order_id: ids.oldCancelled } })).toBe(0)
    expect(await prisma.quotations.findUnique({ where: { id: ids.newQuote } })).not.toBeNull()
    expect(await prisma.orders.findUnique({ where: { id: ids.newCancelled } })).not.toBeNull()

    // Tổ chức đang legal hold: không đổi gì
    expect(await prisma.chat_messages.count({ where: { conversation_id: heldIds.staleChat } })).toBe(1)
    expect((await prisma.customers.findUniqueOrThrow({ where: { id: heldIds.dormant } })).name).toBe("Chị Lan 1")
    expect(await prisma.quotations.findUnique({ where: { id: heldIds.oldQuote } })).not.toBeNull()

    // Lượt sau không còn gì quá hạn ở tổ chức thường
    const again = await runRetentionSweep(NOW)
    expect(again.reduce((n, r) => n + r.rows, 0)).toBe(0)
  })
})
