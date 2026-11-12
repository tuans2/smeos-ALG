import { afterAll, beforeAll, describe, it, vi } from "vitest"

// AI kiểm ảnh là dịch vụ ngoài — giả lập kết luận "khớp"; phần còn lại của route chạy thật
const MATCH = { isMatch: true, confidenceScore: 95, verdict: "MATCH", reason: "Đúng mẫu" }
vi.mock("@/modules/greeting-card/use-cases/verify-qc-photo-ai", () => ({ verifyQcPhotoWithAi: async () => MATCH }))
vi.mock("@/modules/greeting-card/use-cases/verify-pod-photo-ai", () => ({ verifyPodPhotoWithAi: async () => MATCH }))

import * as O from "@/app/api/v1/_contracts/responses-coordinator-ops"
import { POST as approveBypass } from "@/app/api/v1/coordinator/orders/[id]/approve-bypass/route"
import { POST as approveCustomerPhoto } from "@/app/api/v1/coordinator/orders/[id]/approve-customer-photo/route"
import { POST as confirmDelivery } from "@/app/api/v1/coordinator/orders/[id]/confirm-delivery/route"
import { POST as craftFeeComplaint } from "@/app/api/v1/coordinator/orders/[id]/craft-fee-complaint/route"
import { POST as setShipper } from "@/app/api/v1/coordinator/orders/[id]/set-shipper/route"
import { POST as uploadQc } from "@/app/api/v1/coordinator/orders/[id]/upload-qc-subcontract/route"
import { POST as requestBypass } from "@/app/api/v1/public/subcontract/[orderCode]/request-bypass/route"
import { POST as act } from "@/app/api/v1/public/subcontract/[orderCode]/route"
import { SUBCONTRACT_TOKEN_HEADER, signSubcontractBranchToken } from "@/modules/greeting-card/infra/subcontract-link-token"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"
import { syncSubcontractShares } from "../helpers/subcontract-shares"

/** Hợp đồng phản hồi Điều phối — đơn gia công của chi nhánh chuỗi (OpenAPI nội bộ, PO 07/11/2026). */
const BASE = "http://localhost/api/v1/coordinator/orders"
const PUBLIC = "http://localhost/api/v1/public/subcontract"
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0])
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — Điều phối: chuỗi gia công", () => {
  let t: Tenant
  let branchId: string
  const send = (id: string, path: string, body: unknown) => withSession(`${BASE}/${id}/${path}`, t.token, { method: "POST", body: JSON.stringify(body) })
  const upload = (id: string, path: string) => {
    const form = new FormData()
    form.set("file", new File([JPEG], "anh.jpg", { type: "image/jpeg" }))
    form.set("note", "Ảnh chụp tại xưởng")
    // Không qua `withSession` (nó ép content-type JSON) — để fetch tự đặt ranh giới multipart
    const cookie = withSession(BASE, t.token).headers.get("cookie") ?? ""
    return new Request(`${BASE}/${id}/${path}`, { method: "POST", headers: { cookie }, body: form })
  }
  /** Chi nhánh thao tác qua link ký riêng (route công khai). */
  const branch = (code: string, path: string, body: unknown) =>
    new Request(`${PUBLIC}/${code}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", [SUBCONTRACT_TOKEN_HEADER]: signSubcontractBranchToken(t.organizationId, code, branchId) },
      body: JSON.stringify(body),
    })
  const pcode = (code: string) => ({ params: Promise.resolve({ orderCode: code }) })

  /** Đơn gia công đã được chi nhánh nhận và chốt làm. */
  async function claimed(code: string): Promise<string> {
    const order = await prisma.orders.create({
      data: {
        organization_id: t.organizationId, code, source: "BROCHURE", status: "CONFIRMED", total_vnd: 500_000, paid_vnd: 500_000, balance_vnd: 0,
        created_by: "test", card_message: "Chúc mừng khai trương",
        delivery_address: { recipientName: "Người Nhận", recipientPhone: "0912345678", fullAddress: "1 Lê Lợi, Q1" },
      },
    })
    await prisma.order_coordinations.create({
      data: { organization_id: t.organizationId, order_id: order.id, metadata: { subcontract_dispatch: {
        orderId: order.id, orderCode: code, dispatchStatus: "OPEN", currentRound: 1, claimedBranchId: null, claimedAt: null,
        graceExpiresAt: null, declinedBranchIds: [], invitedBranchIds: [branchId], roundExpiresAt: null,
      } } },
    })
    await syncSubcontractShares(t.organizationId, order.id)
    await act(branch(code, "", { action: "CLAIM", branchId }), pcode(code))
    await act(branch(code, "", { action: "COMMIT", branchId }), pcode(code))
    return order.id
  }

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-chuoi-gia-cong")
    branchId = (await prisma.branches.create({ data: { organization_id: t.organizationId, name: "Chi nhánh Q1", code: "CN-Q1" } })).id
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("Điều phối làm thay chi nhánh: ảnh thành phẩm, duyệt ảnh thay khách, shipper, khiếu nại phí, xác nhận giao", async () => {
    const id = await claimed("DH261108-0001")
    await expectContract(await uploadQc(upload(id, "upload-qc-subcontract"), ps(id)), 200, O.qcUploadResponse, "co-qc-upload")
    await expectContract(await approveCustomerPhoto(send(id, "approve-customer-photo", {}), ps(id)), 200, O.customerPhotoResponse, "co-customer-photo")
    await expectContract(await setShipper(send(id, "set-shipper", { shipper_name: "Anh Tâm", shipper_phone: "0901112223" }), ps(id)), 200, O.setShipperResponse, "co-shipper")
    await expectContract(await setShipper(send(id, "set-shipper", { shipper_name: "Anh Tâm", shipper_phone: "0901112223" }), ps(id)), 200, O.setShipperResponse, "co-shipper")
    await expectContract(await craftFeeComplaint(send(id, "craft-fee-complaint", { reason: "Hoa bị dập cánh" }), ps(id)), 200, O.craftFeeComplaintResponse, "co-complaint")
    await expectContract(await confirmDelivery(upload(id, "confirm-delivery"), ps(id)), 200, O.confirmDeliveryResponse, "co-delivered")
    await expectContract(await confirmDelivery(upload(id, "confirm-delivery"), ps(id)), 200, O.confirmDeliveryResponse, "co-delivered")
  })

  it("chi nhánh xin bỏ qua bằng chứng: Điều phối từ chối, rồi duyệt (trừ điểm chất lượng)", async () => {
    const id = await claimed("DH261108-0002")
    await requestBypass(branch("DH261108-0002", "/request-bypass", { branchId, step: "QC", reason: "Máy ảnh hỏng" }), pcode("DH261108-0002"))
    await expectContract(await approveBypass(send(id, "approve-bypass", { step: "QC", decision: "REJECT", review_note: "Cần ảnh" }), ps(id)), 200, O.bypassDecisionResponse, "co-bypass")
    await requestBypass(branch("DH261108-0002", "/request-bypass", { branchId, step: "QC", reason: "Máy ảnh vẫn hỏng" }), pcode("DH261108-0002"))
    await expectContract(await approveBypass(send(id, "approve-bypass", { step: "QC", decision: "APPROVE" }), ps(id)), 200, O.bypassDecisionResponse, "co-bypass")
  })
})
