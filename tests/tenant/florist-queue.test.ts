import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as assign } from "@/app/api/v1/orders/[id]/assign/route"
import { POST as report } from "@/app/api/v1/orders/[id]/my-work/route"
import { GET as myWork } from "@/app/api/v1/orders/my-work/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 4.13 — "Việc của tôi" cho Thợ cắm hoa: chỉ việc giao cho mình, nhận việc, báo xong. */

const BASE = "http://localhost/api/v1/orders"
type Work = { orderId: string; code: string; productionStatus: string; assigneeName: string | null; items: { recipe: { flowerName: string }[] }[] }

describe("hàng đợi chế tác của thợ", () => {
  let a: Tenant
  let b: Tenant
  let lan: { userId: string; token: string }
  let hoa: { userId: string; token: string }

  async function order(code: string, date: string) {
    return (await prisma.orders.create({
      data: {
        id: randomUUID(), organization_id: a.organizationId, code, status: "CONFIRMED", created_by: a.userId,
        total_vnd: 900_000, paid_vnd: 900_000, balance_vnd: 0, card_message: "Chúc mừng sinh nhật",
        delivery_window: { date, timeSlot: "09:00-11:00" },
        items: { create: [{ organization_id: a.organizationId, description: "Bó hồng", quantity: 1, unit_price_vnd: 900_000,
          metadata: { flowers: [{ flowerName: "Hồng Ohara", quantity: 12, unit: "cành", color: "hồng", role: "Chủ đạo" }], costVnd: 400_000 } }] },
      },
    })).id
  }
  const assignTo = (token: string, orderId: string, assigneeId: string) =>
    assign(withSession(`${BASE}/${orderId}/assign`, token, { method: "POST", body: JSON.stringify({ assignee_id: assigneeId }) }), { params: Promise.resolve({ id: orderId }) })
  const list = async (token: string, scope = "") =>
    ((await readJson(await myWork(withSession(`${BASE}/my-work${scope}`, token)))).data as Work[])
  const act = (token: string, orderId: string, action: string) =>
    report(withSession(`${BASE}/${orderId}/my-work`, token, { method: "POST", body: JSON.stringify({ action }) }), { params: Promise.resolve({ id: orderId }) })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    lan = await addStaffWithSession(a, "tho_cam", "lan")
    hoa = await addStaffWithSession(a, "tho_cam", "hoa")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("thợ chỉ thấy việc giao cho mình, sắp theo giờ giao, có công thức nhưng không có giá", async () => {
    const late = await order("DH-2", "2026-11-06")
    const early = await order("DH-1", "2026-11-05")
    const other = await order("DH-3", "2026-11-05")
    for (const id of [late, early]) expect((await assignTo(a.token, id, lan.userId)).status).toBe(200)
    expect((await assignTo(a.token, other, hoa.userId)).status).toBe(200)

    const mine = await list(lan.token)
    expect(mine.map((w) => w.code)).toEqual(["DH-1", "DH-2"])
    expect(mine[0]!.items[0]!.recipe[0]!.flowerName).toBe("Hồng Ohara")
    const raw = JSON.stringify(mine)
    expect(raw).not.toContain("900000")
    expect(raw).not.toContain("costVnd")

    const team = await list(a.token, "?scope=team")
    expect(team).toHaveLength(3)
    expect(team.find((w) => w.code === "DH-3")!.assigneeName).toBe("hoa")
    expect((await myWork(withSession(`${BASE}/my-work?scope=team`, lan.token))).status).toBe(403)
  })

  it("nhận việc → báo xong; việc của thợ khác hoặc tổ chức khác → 404", async () => {
    const id = await order("DH-1", "2026-11-05")
    await assignTo(a.token, id, lan.userId)

    expect((await act(hoa.token, id, "START")).status).toBe(404)
    expect((await act(b.token, id, "START")).status).toBe(404)
    expect((await act(lan.token, id, "FINISH")).status).toBe(422)
    expect((await act(lan.token, id, "START")).status).toBe(200)
    expect((await act(lan.token, id, "FINISH")).status).toBe(200)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id } })).production_status).toBe("READY")
    expect(await list(lan.token)).toHaveLength(0)
  })

  it("giao lại cho thợ khác → việc rời hàng đợi thợ cũ; không giao được cho người ngoài tổ chức", async () => {
    const id = await order("DH-1", "2026-11-05")
    await assignTo(a.token, id, lan.userId)
    await assignTo(a.token, id, hoa.userId)
    expect(await list(lan.token)).toHaveLength(0)
    expect((await list(hoa.token)).map((w) => w.code)).toEqual(["DH-1"])
    expect((await act(lan.token, id, "START")).status).toBe(404)

    expect((await assignTo(a.token, id, b.userId)).status).toBe(422)
  })
})
