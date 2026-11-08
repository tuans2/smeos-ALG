import { describe, expect, it } from "vitest"

import { canApproveScript, canApproveVideo } from "../../domain/video-approval-rules"
import { approvalBlocked, videoJobNotFound } from "../video-errors"

describe("video-errors", () => {
  it("không thấy job → 404 NOT_FOUND, không nhắc mã job", () => {
    const err = videoJobNotFound()
    expect([err.code, err.status]).toEqual(["NOT_FOUND", 404])
    expect(err.message).toBe("Không tìm thấy tác vụ video")
  })

  it("sai trạng thái → 409 CONFLICT, giữ lý do của luật", () => {
    const check = canApproveScript({ stage: "RENDERING", scriptApproval: "PENDING", scenes: [], format: "REEL_15S" })
    const err = approvalBlocked(check, "dự phòng")
    expect([err.code, err.status]).toEqual(["CONFLICT", 409])
    expect(err.message).toContain("RENDERING")
  })

  it("nội dung chưa đạt luật → 422 UNPROCESSABLE_ENTITY", () => {
    const script = canApproveScript({ stage: "DRAFT", scriptApproval: "PENDING", scenes: [], format: "REEL_15S" })
    expect(approvalBlocked(script, "dự phòng").code).toBe("UNPROCESSABLE_ENTITY")
    const video = canApproveVideo({ stage: "RENDER_COMPLETED", videoApproval: "PENDING", finalVideoUrl: null, finalAssetId: null })
    expect(approvalBlocked(video, "dự phòng").status).toBe(422)
  })

  it("luật không ghi loại → mặc định 409, lý do trống thì dùng câu dự phòng", () => {
    const err = approvalBlocked({ allowed: false }, "Video chưa đủ điều kiện để phê duyệt")
    expect([err.code, err.message]).toEqual(["CONFLICT", "Video chưa đủ điều kiện để phê duyệt"])
  })
})
