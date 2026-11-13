import { beforeEach, describe, expect, it, vi } from "vitest"

const getTrackingOrderByCode = vi.fn()
const recordApproval = vi.fn()
const isBrochureOwner = vi.fn()

vi.mock("@/modules/greeting-card/infra/brochure-order-repository", () => ({
  BrochureOrderRepository: class { getTrackingOrderByCode = getTrackingOrderByCode },
  getBrochureOrderRepository: () => ({ getTrackingOrderByCode }),
}))
vi.mock("@/modules/greeting-card/infra/photo-approval-repository", () => ({
  PhotoApprovalRepository: class { recordApproval = recordApproval },
  getPhotoApprovalRepository: () => ({ recordApproval }),
}))
vi.mock("@/modules/greeting-card/use-cases/brochure-owner", () => ({ isBrochureOwner }))

const { approveBrochurePhoto } = await import("@/modules/greeting-card/use-cases/approve-brochure-photo")

const req = new Request("http://localhost/x")
const order = {
  id: "o1",
  organization_id: "org1",
  status: "CONFIRMED",
  production_status: "READY",
  greeting_sessions: [{ send_code: "LINK1" }],
  qc_records: [{ notes: "PRODUCT_PHOTO_UPLOADED" }],
}

describe("approveBrochurePhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isBrochureOwner.mockReturnValue(true)
    getTrackingOrderByCode.mockResolvedValue(order)
    recordApproval.mockResolvedValue({ created: true })
  })

  it("thiếu link → 404, không ghi gì (người chỉ biết mã đơn không xác nhận hộ được)", async () => {
    await expect(approveBrochurePhoto(req, "DH1", null)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(recordApproval).not.toHaveBeenCalled()
  })

  it("không phải chủ phiên → 404", async () => {
    isBrochureOwner.mockReturnValue(false)
    await expect(approveBrochurePhoto(req, "DH1", "LINK1")).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(recordApproval).not.toHaveBeenCalled()
  })

  it("link của đơn khác → 404", async () => {
    await expect(approveBrochurePhoto(req, "DH1", "OTHER")).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(recordApproval).not.toHaveBeenCalled()
  })

  it("chưa có ảnh thành phẩm → từ chối", async () => {
    getTrackingOrderByCode.mockResolvedValue({ ...order, qc_records: [] })
    await expect(approveBrochurePhoto(req, "DH1", "LINK1")).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("chủ phiên đúng link → ghi xác nhận", async () => {
    await expect(approveBrochurePhoto(req, "DH1", "LINK1")).resolves.toEqual({ created: true })
    expect(recordApproval).toHaveBeenCalledWith(order)
  })
})
