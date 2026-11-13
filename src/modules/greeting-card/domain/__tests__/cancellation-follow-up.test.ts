import { describe, it, expect } from "vitest"
import { autoApprovedNotice, needsFollowUp } from "../cancellation-request"

/** Đơn hệ thống tự huỷ (quá hạn chưa duyệt đề xuất từ chối nhận đơn) phải nằm trong Hộp việc Điều hành tới khi xử lý xong. */
describe("cancellation follow-up", () => {
  it("chỉ đề xuất đã duyệt và việc còn PENDING mới cần Điều hành xử lý", () => {
    expect(needsFollowUp({ status: "APPROVED", followUp: { status: "PENDING", refundDueVnd: 500_000 } })).toBe(true)
    expect(needsFollowUp({ status: "APPROVED", followUp: { status: "DONE", refundDueVnd: 500_000 } })).toBe(false)
    expect(needsFollowUp({ status: "APPROVED", followUp: undefined })).toBe(false)
    expect(needsFollowUp({ status: "PENDING", followUp: { status: "PENDING", refundDueVnd: 0 } })).toBe(false)
  })

  it("tin báo Điều hành nêu rõ số tiền phải hoàn, không nhắc hoàn khi khách chưa trả", () => {
    expect(autoApprovedNotice("DH001", 30, 500_000)).toMatch(/DH001.*30 phút.*hoàn 500\.000đ/)
    expect(autoApprovedNotice("DH002", 15, 0)).not.toMatch(/hoàn/)
  })
})
