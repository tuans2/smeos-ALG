import { describe, expect, it } from "vitest"
import { MAX_POLLS, POLL_INTERVAL_MS, jobStorageKey, parseCreatedJob, parsePolledJob } from "./generation-job-logic"

describe("hợp đồng API của các công cụ tạo ảnh (03c, pilot + đợt A-1)", () => {
  it("đọc đúng phản hồi tạo job thật của API (không bọc data)", () => {
    expect(parseCreatedJob({ job_id: "j1", status: "PENDING", usage: { cost_credit: 2, balance_after: 18 } })).toEqual({
      jobId: "j1",
      costCredit: 2,
      balanceAfter: 18,
    })
  })

  it("vẫn đọc được nếu API bọc data; thiếu job id thì null", () => {
    expect(parseCreatedJob({ data: { jobId: "j2" } })?.jobId).toBe("j2")
    expect(parseCreatedJob({ status: "PENDING" })).toBeNull()
    expect(parseCreatedJob(null)).toBeNull()
  })

  it("trạng thái poll ánh xạ qua task-state; chỉ có kết quả khi đã xong", () => {
    expect(parsePolledJob({ status: "PROCESSING" })).toEqual({ state: "running", result: null, error: null })
    const done = parsePolledJob<{ masterUrl: string }>({ status: "COMPLETED", masterUrl: "u" })
    expect(done.state).toBe("succeeded")
    expect(done.result?.masterUrl).toBe("u")
    expect(parsePolledJob({ status: "FAILED", error: "Ảnh quá mờ" })).toMatchObject({ state: "failed", error: "Ảnh quá mờ" })
  })

  it("trạng thái lạ không bị coi là xong", () => {
    expect(parsePolledJob({ status: "WHATEVER" }).state).toBeNull()
  })

  it("vòng hỏi lại có giới hạn ~5 phút và khoá nhớ gắn tổ chức + công cụ", () => {
    expect(MAX_POLLS * POLL_INTERVAL_MS).toBe(300_000)
    expect(jobStorageKey("anh-san-pham", "org-a")).toBe("alg.anh-san-pham.lastJobId__org-a")
    expect(jobStorageKey("bo-anh-san-pham", "org-a")).not.toBe(jobStorageKey("anh-san-pham", "org-a"))
    expect(jobStorageKey("anh-san-pham", null)).toBeNull()
  })
})
