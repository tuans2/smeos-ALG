import { describe, expect, it } from "vitest"

import { NOTICE_DAYS } from "@/core/http/deprecation"

import { INTEGRATION_KEY_REUSE_CHANGE } from "./integration-key-reuse"
import { fieldSunsetActive, INTEGRATION_FIELD_SUNSET, SUNSET_FIELDS, withoutSunsetFields } from "./integration-field-sunset"

describe("withoutSunsetFields — gỡ trường nội bộ khỏi Integration API (ARC-024)", () => {
  it("báo trước không dưới mức tối thiểu cho bề mặt bên ngoài; cùng ngày với lịch 422 khoá trùng", () => {
    const days = (Date.parse(INTEGRATION_FIELD_SUNSET.effective) - Date.parse(INTEGRATION_FIELD_SUNSET.announced)) / 86_400_000
    expect(days).toBeGreaterThanOrEqual(NOTICE_DAYS.external)
    expect(INTEGRATION_FIELD_SUNSET.effective).toBe(INTEGRATION_KEY_REUSE_CHANGE.effective)
  })

  it("danh sách đúng như PO duyệt 11/11/2026", () => {
    expect(SUNSET_FIELDS.job).toEqual(["user_id", "workspace_id", "branch_id", "request_id", "job_group_id", "run_after", "error"])
    expect(SUNSET_FIELDS.usage).toEqual(["user_id", "workspace_id", "cost_usd", "metadata"])
    expect(SUNSET_FIELDS.catalogLink).toEqual(["created_by", "revoked_by", "trashed_at", "purge_after"])
    expect(SUNSET_FIELDS.masterImageAsset).toEqual(["storage_key", "thumb_key"])
    expect(SUNSET_FIELDS.asset).toHaveLength(16)
    // Trường đối tác cần để dùng kết quả không bao giờ nằm trong danh sách gỡ
    for (const kept of ["id", "payload", "output", "failure_kind", "status", "url", "cost_credit"]) {
      for (const fields of Object.values(SUNSET_FIELDS)) expect(fields as readonly string[]).not.toContain(kept)
    }
  })

  it("trước 00:00 UTC ngày hiệu lực giữ nguyên bản ghi; từ ngày đó bỏ đúng các trường", () => {
    const job = { id: "j1", user_id: "u", workspace_id: "w", payload: { a: 1 }, output: null, error: "x", status: "DONE" }
    expect(fieldSunsetActive(new Date("2027-02-08T23:59:59Z"))).toBe(false)
    expect(withoutSunsetFields("job", job, new Date("2027-02-08T23:59:59Z"))).toBe(job)
    expect(withoutSunsetFields("job", job, new Date("2027-02-09T00:00:00Z"))).toEqual({ id: "j1", payload: { a: 1 }, output: null, status: "DONE" })
    // Không đổi bản ghi gốc
    expect(job).toHaveProperty("user_id", "u")
  })
})
