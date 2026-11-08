import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { BrochureOrderRepository } from "@/modules/greeting-card/infra/brochure-order-repository"
import type { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"

// Nhận đơn kiểm đề xuất huỷ đang chờ — unit test không chạm DB
vi.mock("@/modules/greeting-card/infra/cancellation-repository", () => ({ CancellationRepository: class { listPending = async () => [] } }))

const confirmDeposit = vi.fn(async () => ({ paidVnd: 250_000 }))
vi.mock("@/modules/greeting-card/use-cases/confirm-brochure-payment", () => ({ coordinatorConfirmDepositPayment: confirmDeposit }))
vi.mock("@/modules/greeting-card/use-cases/notify-customer", () => ({ queueOrderNotification: vi.fn() }))

const { coordinatorAcceptBrochureOrder } = await import("@/modules/greeting-card/use-cases/update-brochure-order-status")

const base = { organizationId: "org-test", workspaceId: "", branchId: null }
const admin: TenantContext = { ...base, userId: "dieu-hanh", capabilities: new Set(["R4", "R6", "R11"]) }
const coordinator: TenantContext = { ...base, userId: "dieu-phoi", capabilities: new Set(["R4", "R6"]) }
const strict = {
  brochure_workflow_policy: { require_admin_deposit_approval: true, allow_sla_escalation: false },
  brochure_policy: { require_paid_before_production: true },
}
const shop = { getShopProfile: vi.fn().mockResolvedValue({ name: "Tiệm", settings: strict }) } as unknown as GreetingCardRepository
const repoWithOrder = () => ({
  findBrochureOrder: vi.fn().mockResolvedValue({
    id: "o1", code: "DH-1", status: "DRAFT", production_status: "WAITING", delivery_status: "PENDING",
    total_vnd: 500_000, paid_vnd: 0, created_at: new Date(), delivery_window: null,
    greeting_sessions: [{ status: "PAYMENT_REPORTED", payment_proof_asset_id: "proof-1" }],
  }),
  applyProgress: vi.fn().mockResolvedValue({ success: true }),
}) as unknown as BrochureOrderRepository

/**
 * Lỗi 16/10/2026: Điều hành bấm "Xác nhận Tiền Cọc" trên màn Điều phối bị báo "Cài đặt của cửa hàng
 * yêu cầu chỉ Điều hành mới được duyệt tiền cọc" — mã luôn coi người bấm là Điều phối.
 */
describe("Duyệt cọc theo năng lực người bấm khi tiệm bắt Điều hành duyệt", () => {
  it("Điều hành (R11) tiếp nhận đơn có bill → ghi nhận cọc rồi tiếp nhận", async () => {
    const repo = repoWithOrder()
    await coordinatorAcceptBrochureOrder(admin, "o1", {}, repo, shop)
    expect(confirmDeposit).toHaveBeenCalledWith(admin, "o1", { note: undefined })
    expect(repo.applyProgress).toHaveBeenCalled()
  })

  it("ghi cọc xong tiệm 1 cửa hàng đã tự nhận đơn → không ghi tiến độ lần hai (lỗi 409 08/11/2026)", async () => {
    confirmDeposit.mockResolvedValueOnce({ paidVnd: 250_000, autoAccepted: true } as never)
    const repo = repoWithOrder()
    await expect(coordinatorAcceptBrochureOrder(admin, "o1", {}, repo, shop)).resolves.toEqual({ orderId: "o1", orderCode: "DH-1" })
    expect(repo.applyProgress).not.toHaveBeenCalled()
  })

  it("ghi cọc không tự nhận đơn → đọc lại đơn rồi mới tiếp nhận (khoá lạc quan khớp bản mới)", async () => {
    const repo = repoWithOrder()
    const fresh = { ...(await repo.findBrochureOrder(admin, "o1"))!, status: "CONFIRMED", paid_vnd: 250_000 }
    vi.mocked(repo.findBrochureOrder).mockClear().mockResolvedValueOnce({ ...fresh, status: "DRAFT", paid_vnd: 0 } as never).mockResolvedValueOnce(fresh as never)
    await coordinatorAcceptBrochureOrder(admin, "o1", {}, repo, shop)
    expect(repo.findBrochureOrder).toHaveBeenCalledTimes(2)
    expect(vi.mocked(repo.applyProgress).mock.calls[0]?.[1]).toBe(fresh)
  })

  it("Điều phối (không có R11) vẫn bị chặn, không tự ghi tiền", async () => {
    confirmDeposit.mockClear()
    const repo = repoWithOrder()
    await expect(coordinatorAcceptBrochureOrder(coordinator, "o1", {}, repo, shop)).rejects.toThrow(/Chờ Điều hành xác nhận tiền cọc/)
    expect(confirmDeposit).not.toHaveBeenCalled()
  })
})
