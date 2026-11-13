import { describe, expect, it } from "vitest"
import {
  orderPhotoApproval,
  photoApprovalDispatchBlocker,
  photoApprovalState,
  photoMilestonesOf,
} from "@/modules/greeting-card/domain/photo-approval"
import { BROCHURE_WORKFLOW_POLICY_KEY, LEAN_WORKFLOW_POLICY, STANDARD_WORKFLOW_POLICY, STRICT_WORKFLOW_POLICY, serializeWorkflowPolicy } from "@/modules/greeting-card/domain/brochure-workflow-policy"

const uploadedAt = new Date("2026-10-20T08:00:00Z")
const at = (min: number) => new Date(uploadedAt.getTime() + min * 60_000)

describe("khách duyệt ảnh thành phẩm trước khi giao (PO 15/10/2026)", () => {
  it("Bỏ qua: không chờ khách", () => {
    const s = photoApprovalState({ mode: "BYPASS", uploadedAt, customerApprovedAt: null, now: at(1) })
    expect(s.status).toBe("BYPASSED")
    expect(photoApprovalDispatchBlocker(s)).toBeNull()
  })

  it("Tự duyệt: chờ đúng số phút tiệm cài rồi tự qua", () => {
    const pending = photoApprovalState({ mode: "AUTO_PASS_10M", reviewMinutes: 10, uploadedAt, customerApprovedAt: null, now: at(4) })
    expect(pending.status).toBe("PENDING")
    expect(photoApprovalDispatchBlocker(pending)).toContain("còn 6 phút")
    expect(photoApprovalState({ mode: "AUTO_PASS_10M", reviewMinutes: 10, uploadedAt, customerApprovedAt: null, now: at(10) }).status).toBe("AUTO_APPROVED")
  })

  it("Bắt buộc khách duyệt: khách im lặng thì tự qua sau 30 phút", () => {
    expect(photoApprovalState({ mode: "REQUIRE_CUSTOMER", reviewMinutes: 10, uploadedAt, customerApprovedAt: null, now: at(20) }).status).toBe("PENDING")
    expect(photoApprovalState({ mode: "REQUIRE_CUSTOMER", reviewMinutes: 10, uploadedAt, customerApprovedAt: null, now: at(30) }).status).toBe("AUTO_APPROVED")
  })

  it("khách bấm duyệt thì giao ngay; chưa có ảnh (đã bỏ qua ảnh) thì không chờ", () => {
    expect(photoApprovalState({ mode: "REQUIRE_CUSTOMER", uploadedAt, customerApprovedAt: at(2), now: at(3) }).status).toBe("APPROVED")
    expect(photoApprovalDispatchBlocker(photoApprovalState({ mode: "REQUIRE_CUSTOMER", uploadedAt: null, customerApprovedAt: null, now: at(3) }))).toBeNull()
  })

  it("chụp lại ảnh thì tính từ lần tải mới nhất", () => {
    const m = photoMilestonesOf([
      { notes: "PRODUCT_PHOTO_UPLOADED", created_at: at(20) },
      { notes: "PRODUCT_PHOTO_UPLOADED", created_at: uploadedAt },
    ])
    expect(m.uploadedAt).toEqual(at(20))
  })

  it("chế độ theo gói tiệm chọn; bộ sưu tập ghi đè số phút", () => {
    const order = (filters: unknown) => ({ qc_records: [{ notes: "PRODUCT_PHOTO_UPLOADED", created_at: uploadedAt }], greeting_sessions: [{ catalog: { filters } }] })
    const settings = (p: typeof LEAN_WORKFLOW_POLICY) => ({ [BROCHURE_WORKFLOW_POLICY_KEY]: serializeWorkflowPolicy(p) })
    expect(orderPhotoApproval(order(null), settings(LEAN_WORKFLOW_POLICY), 10, at(1)).status).toBe("BYPASSED")
    expect(orderPhotoApproval(order(null), settings(STANDARD_WORKFLOW_POLICY), 10, at(1)).countdownMinutes).toBe(10)
    expect(orderPhotoApproval(order({ appliedPolicies: { photoApprovalCountdownMinutes: 5 } }), settings(STANDARD_WORKFLOW_POLICY), 10, at(6)).status).toBe("AUTO_APPROVED")
    expect(orderPhotoApproval(order(null), settings(STRICT_WORKFLOW_POLICY), 10, at(1)).countdownMinutes).toBe(30)
  })
  it("khách góp ý sau lần tải ảnh mới nhất → FEEDBACK: không tự duyệt, chặn giao; ảnh mới chạy lại đồng hồ (ALG 5.13)", () => {
    const base = { mode: "AUTO_PASS_10M" as const, reviewMinutes: 10, uploadedAt, customerApprovedAt: null }
    const fb = photoApprovalState({ ...base, feedbackAt: at(3), now: at(30) })
    expect(fb.status).toBe("FEEDBACK")
    expect(photoApprovalDispatchBlocker(fb)).toContain("góp ý")
    expect(photoApprovalState({ ...base, uploadedAt: at(5), feedbackAt: at(3), now: at(6) }).status).toBe("PENDING")
    const milestones = photoMilestonesOf([
      { notes: "PRODUCT_PHOTO_UPLOADED", created_at: uploadedAt },
      { notes: "CUSTOMER_PHOTO_FEEDBACK", created_at: at(2) },
    ])
    expect(milestones.feedbackAt).toEqual(at(2))
  })
})
