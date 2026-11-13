import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as decideCancellation } from "@/app/api/v1/greeting-card/cancellation-requests/[id]/decision/route"
import { CancellationRepository } from "@/modules/greeting-card/infra/cancellation-repository"
import { SELF_APPROVAL_SETTINGS_KEY } from "@/modules/organization/domain/self-approval-policy"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Checklist ALG 9.12 (PO 04/11/2026, Q4): người tạo phiếu không tự duyệt phiếu của mình; công tắc
 * `cho_phep_tu_duyet` mặc định tắt, tổ chức bật lại được.
 */
describe("chặn tự duyệt phiếu đề xuất", () => {
  let a: Tenant
  const repo = new CancellationRepository()

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function proposalBy(proposerId: string) {
    const orderId = randomUUID()
    await prisma.orders.create({
      data: {
        id: orderId, organization_id: a.organizationId, code: `DH-${orderId.slice(0, 6)}`, source: "BROCHURE", status: "CONFIRMED",
        total_vnd: 500_000, paid_vnd: 0, balance_vnd: 500_000, created_by: a.userId,
      },
    })
    const { id } = await repo.createProposal({ ...a.ctx, userId: proposerId }, {
      orderId, senderRole: "SALE", proposal: { type: "CANCEL_ONLY", reason: "Khách đổi ý", refundAmountVnd: 0 },
    })
    return { id, orderId }
  }

  const decide = (token: string, id: string) =>
    decideCancellation(
      withSession(`http://localhost/api/v1/greeting-card/cancellation-requests/${id}/decision`, token, {
        method: "POST", body: JSON.stringify({ approve: true, note: "Đồng ý" }),
      }),
      { params: Promise.resolve({ id }) },
    )

  it("Điều hành tự đề xuất huỷ rồi tự duyệt → 422, đơn giữ nguyên; Điều hành khác duyệt được", async () => {
    const { id, orderId } = await proposalBy(a.userId)

    expect((await decide(a.token, id)).status).toBe(422)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("CONFIRMED")

    const second = await addStaffWithSession(a, "dieu_hanh", "dieu-hanh-2")
    expect((await decide(second.token, id)).status).toBe(200)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("CANCELLED")
  })

  it("tổ chức bật công tắc cho phép tự duyệt → người tạo duyệt được phiếu của mình", async () => {
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { [SELF_APPROVAL_SETTINGS_KEY]: true } } })
    const { id } = await proposalBy(a.userId)
    expect((await decide(a.token, id)).status).toBe(200)
  })

  it("phiếu do người khác tạo không bị ảnh hưởng", async () => {
    const sale = await addStaffWithSession(a, "sale", "lan")
    const { id } = await proposalBy(sale.userId)
    expect((await decide(a.token, id)).status).toBe(200)
  })
})
