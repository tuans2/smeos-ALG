import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// AI kiểm ảnh là dịch vụ ngoài (mạng bị chặn khi test) — giả lập kết luận "khớp"; phần còn lại của route chạy thật
const MATCH = { isMatch: true, confidenceScore: 95, verdict: "MATCH", reason: "Đúng mẫu" }
vi.mock("@/modules/greeting-card/use-cases/verify-qc-photo-ai", () => ({ verifyQcPhotoWithAi: async () => MATCH }))
vi.mock("@/modules/greeting-card/use-cases/verify-pod-photo-ai", () => ({ verifyPodPhotoWithAi: async () => MATCH }))

import { POST as requestBypass } from "@/app/api/v1/public/subcontract/[orderCode]/request-bypass/route"
import { GET as view, POST as act } from "@/app/api/v1/public/subcontract/[orderCode]/route"
import { POST as submitDelivery } from "@/app/api/v1/public/subcontract/[orderCode]/submit-delivery/route"
import { POST as submitShipper } from "@/app/api/v1/public/subcontract/[orderCode]/submit-shipper/route"
import { POST as uploadQc } from "@/app/api/v1/public/subcontract/[orderCode]/upload-qc/route"
import * as R from "@/app/api/v1/public/_contracts/responses-subcontract"
import { prisma } from "@/core/tenancy/infra/prisma"
import { getPhotoApprovalRepository } from "@/modules/greeting-card/infra/photo-approval-repository"
import { SUBCONTRACT_TOKEN_HEADER, signSubcontractBranchToken } from "@/modules/greeting-card/infra/subcontract-link-token"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { syncSubcontractShares } from "../helpers/subcontract-shares"

/**
 * Hợp đồng phản hồi — Thẻ Gia Công công khai `/public/subcontract/{orderCode}/*` (audit API đợt 6): chi nhánh
 * mở link ký riêng, nhận đơn, xin bỏ qua bước, gửi ảnh thành phẩm, shipper, ảnh giao. Cũng là test khoá hành vi (B5).
 */
const BASE = "http://localhost/api/v1/public/subcontract"
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0])

describe("hợp đồng — Thẻ Gia Công công khai", () => {
  let a: Tenant
  let branchId: string

  async function seed(code: string, legacyState = false) {
    const order = await prisma.orders.create({
      data: {
        organization_id: a.organizationId, code, source: "BROCHURE", status: "CONFIRMED", total_vnd: 500_000, paid_vnd: 500_000, balance_vnd: 0,
        created_by: "test", card_message: "Chúc mừng khai trương",
        delivery_address: { recipientName: "Người Nhận", recipientPhone: "0912345678", fullAddress: "1 Lê Lợi, Q1" },
      },
    })
    await prisma.order_coordinations.create({
      data: { organization_id: a.organizationId, order_id: order.id, metadata: { subcontract_dispatch: {
        orderId: order.id, orderCode: code, dispatchStatus: "OPEN", currentRound: 1, claimedBranchId: null, claimedAt: null,
        graceExpiresAt: null, ...(legacyState ? {} : { declinedBranchIds: [] }), invitedBranchIds: [branchId], roundExpiresAt: null,
      } } },
    })
    await syncSubcontractShares(a.organizationId, order.id)
    return order
  }
  const token = (code: string) => signSubcontractBranchToken(a.organizationId, code, branchId)
  const ps = (code: string) => ({ params: Promise.resolve({ orderCode: code }) })
  const post = (code: string, path: string, body: unknown) =>
    new Request(`${BASE}/${code}${path}`, { method: "POST", headers: { "content-type": "application/json", [SUBCONTRACT_TOKEN_HEADER]: token(code) }, body: JSON.stringify(body) })
  const upload = (code: string, path: string, fields: Record<string, string>) => {
    const form = new FormData()
    form.set("file", new File([JPEG], "anh.jpg", { type: "image/jpeg" }))
    for (const [k, v] of Object.entries(fields)) form.set(k, v)
    return new Request(`${BASE}/${code}${path}`, { method: "POST", headers: { [SUBCONTRACT_TOKEN_HEADER]: token(code) }, body: form })
  }
  const get = (code: string) => view(new Request(`${BASE}/${code}?branch=${branchId}&t=${encodeURIComponent(token(code))}`), ps(code))

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("gia-cong-hop-dong")
    branchId = (await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Chi nhánh Q1", code: "CN-Q1" } })).id
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("một vòng gia công của chi nhánh", async () => {
    const code = "DH261107-0001"
    await seed(code)
    await expectContract(await get(code), 200, R.subcontractViewResponse, "subcontract-view")
    await expectContract(await act(post(code, "", { action: "CLAIM", branchId }), ps(code)), 200, R.subcontractActionResponse, "subcontract-action")
    await expectContract(await get(code), 200, R.subcontractViewResponse, "subcontract-view")
    await expectContract(await requestBypass(post(code, "/request-bypass", { branchId, step: "SHIPPER", reason: "Khách tự đến lấy hoa" }), ps(code)), 200, R.subcontractBypassResponse, "subcontract-bypass")
    await expectContract(await act(post(code, "", { action: "COMMIT", branchId }), ps(code)), 200, R.subcontractActionResponse, "subcontract-action")
    const qc = await expectContract(await uploadQc(upload(code, "/upload-qc", { branchId }), ps(code)), 200, R.subcontractQcResponse, "subcontract-qc")
    await expectContract(await get(code), 200, R.subcontractViewResponse, "subcontract-view")
    // AI xác nhận khớp → ảnh được duyệt ngay, không xoá được nữa
    const photoUrl = JSON.stringify(qc).match(/"(\/api\/v1\/storage\/[^"]+)"/)?.[1] ?? "x"
    expect((await act(post(code, "", { action: "DELETE_QC", branchId, photoUrl }), ps(code))).status).toBe(409)
    // Khách duyệt ảnh thành phẩm (cùng đường ghi của `/public/brochure/tracking/{code}/approve-photo`)
    const placed = await prisma.orders.findFirstOrThrow({ where: { organization_id: a.organizationId, code } })
    await getPhotoApprovalRepository().recordApproval(placed)
    await expectContract(await submitShipper(post(code, "/submit-shipper", { branchId, shipperName: "Anh Tâm", shipperPhone: "0901112223" }), ps(code)), 200, R.subcontractShipperResponse, "subcontract-shipper")
    const again = await expectContract(await submitShipper(post(code, "/submit-shipper", { branchId, shipperName: "Anh Tâm", shipperPhone: "0901112223" }), ps(code)), 200, R.subcontractShipperResponse, "subcontract-shipper")
    expect((again.data as { alreadySubmitted?: boolean }).alreadySubmitted).toBe(true)
    await expectContract(await submitDelivery(upload(code, "/submit-delivery", { branchId, note: "Đã giao tận tay" }), ps(code)), 200, R.subcontractDeliveryResponse, "subcontract-delivery")
    await expectContract(await get(code), 200, R.subcontractViewResponse, "subcontract-view")
  })

  it("chi nhánh huỷ trong hạn sau khi nhận", async () => {
    const code = "DH261107-0002"
    await seed(code)
    await act(post(code, "", { action: "CLAIM", branchId }), ps(code))
    await expectContract(await act(post(code, "", { action: "CANCEL", branchId }), ps(code)), 200, R.subcontractActionResponse, "subcontract-action")
  })

  it("state điều phối cũ thiếu declinedBranchIds: nhận rồi huỷ vẫn 200 (từng 500)", async () => {
    const code = "DH261107-0004"
    await seed(code, true)
    await expectContract(await act(post(code, "", { action: "CLAIM", branchId }), ps(code)), 200, R.subcontractActionResponse, "subcontract-action")
    await expectContract(await act(post(code, "", { action: "CANCEL", branchId }), ps(code)), 200, R.subcontractActionResponse, "subcontract-action")
  })

  it("không token → 404", async () => {
    const code = "DH261107-0003"
    await seed(code)
    expect((await view(new Request(`${BASE}/${code}?branch=${branchId}`), ps(code))).status).toBe(404)
  })
})
