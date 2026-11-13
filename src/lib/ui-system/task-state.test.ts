import { describe, expect, it } from "vitest"
import {
  isTaskBusy,
  isTaskTerminal,
  reportedProgress,
  taskNeedsReview,
  taskStateFromBackend,
  taskStateLabel,
} from "./task-state"

describe("taskStateFromBackend (03c UX-016)", () => {
  it.each([
    ["PENDING", "queued"],
    ["PROCESSING", "running"],
    ["COMPLETED", "succeeded"],
    ["FAILED", "failed"],
    ["CANCELLED", "canceled"],
  ])("job_status %s → %s", (backend, ui) => {
    expect(taskStateFromBackend(backend)).toBe(ui)
  })

  it.each([
    ["PROCESSING", "running"],
    ["READY", "succeeded"],
    ["FAILED", "failed"],
  ])("asset_state %s → %s", (backend, ui) => {
    expect(taskStateFromBackend(backend)).toBe(ui)
  })

  it.each([
    ["SCRIPT_GENERATING", "running"],
    ["RENDERING", "running"],
    ["SCRIPT_READY", "succeeded"],
    ["RENDER_COMPLETED", "succeeded"],
    ["FAILED", "failed"],
  ])("video_stage %s → %s", (backend, ui) => {
    expect(taskStateFromBackend(backend)).toBe(ui)
  })

  it("chấp nhận chữ thường và khoảng trắng từ API cũ", () => {
    expect(taskStateFromBackend(" done ")).toBe("succeeded")
    expect(taskStateFromBackend("processing")).toBe("running")
  })

  it("giá trị lạ hoặc rỗng không bao giờ bị coi là đã xong", () => {
    expect(taskStateFromBackend("APPROVED")).toBeNull()
    expect(taskStateFromBackend("TIMEOUT")).toBeNull()
    expect(taskStateFromBackend("")).toBeNull()
    expect(taskStateFromBackend(undefined)).toBeNull()
  })
})

describe("trạng thái phụ", () => {
  it("kết quả chờ duyệt có nhãn riêng", () => {
    expect(taskNeedsReview("RENDER_COMPLETED")).toBe(true)
    expect(taskNeedsReview("COMPLETED")).toBe(false)
    expect(taskStateLabel("succeeded", true)).toBe("Đã xong — chờ duyệt")
    expect(taskStateLabel("running")).toBe("Đang xử lý")
  })

  it("phân biệt kết thúc và đang bận", () => {
    expect(isTaskTerminal("failed")).toBe(true)
    expect(isTaskTerminal("running")).toBe(false)
    expect(isTaskBusy("submitting")).toBe(true)
    expect(isTaskBusy("succeeded")).toBe(false)
  })

  it("chỉ nhận tiến độ là số thật", () => {
    expect(reportedProgress(42.6)).toBe(43)
    expect(reportedProgress(140)).toBe(100)
    expect(reportedProgress(undefined)).toBeNull()
    expect(reportedProgress("50")).toBeNull()
  })
})
