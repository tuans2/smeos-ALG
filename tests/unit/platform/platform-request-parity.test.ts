import { describe, expect, it } from "vitest"

import { billingAccountBody, governanceMatrixBody, uxRolloutFlagsBody } from "@/app/api/v1/platform/_contracts/requests"
import { parseDecisions } from "@/modules/organization/domain/governance-decisions"
import { parseUxRolloutFlags } from "@/modules/platform/domain/ux-rollout-flags"
import { parseBillingAccount } from "@/modules/subscription/infra/billing-account-store"

/**
 * Ba thân do hàm parse tự viết ở module kiểm; OpenAPI khai lược đồ MÔ TẢ ở `_contracts/requests.ts`. Test này giữ
 * hai bên khớp nhau (OpenAPI `/platform/*`, PO 07/11/2026).
 */
describe("lược đồ mô tả khớp hàm parse của module", () => {
  it.each([
    [{ bankBin: "970422", bankName: "MB", accountNumber: "0123456789", accountHolder: "CONG TY A" }],
    [{ bankBin: " 970422 ", accountNumber: "123456", accountHolder: " A " }],
    [{ bankBin: "97042", accountNumber: "0123456789", accountHolder: "A" }],
    [{ bankBin: "970422", accountNumber: "12345", accountHolder: "A" }],
    [{ bankBin: "970422", accountNumber: "0123456789", accountHolder: "  " }],
    [{ bankBin: "970422", accountNumber: "012345678901234567890", accountHolder: "A" }],
    [null],
  ])("tài khoản nhận tiền %j", (sample) => {
    expect(billingAccountBody.safeParse(sample).success).toBe(parseBillingAccount(sample) !== null)
  })

  it("ma trận quản trị: mọi mục hợp lệ theo lược đồ được giữ nguyên", () => {
    const body = { decisions: { overrides: { "ship.free": true, "pay:cod": false }, locks: { "ship.free": { enabled: true } } } }
    expect(governanceMatrixBody.safeParse(body).success).toBe(true)
    expect(parseDecisions(body.decisions)).toEqual(body.decisions)
  })

  it("ma trận quản trị: khoá sai dạng — lược đồ báo sai, hàm parse bỏ qua mục đó", () => {
    const body = { decisions: { overrides: { "khoá có dấu": true, ok: true }, locks: {} } }
    expect(governanceMatrixBody.safeParse(body).success).toBe(false)
    expect(parseDecisions(body.decisions)).toEqual({ overrides: { ok: true }, locks: {} })
  })

  it("cờ giao diện: luật hợp lệ theo lược đồ được giữ nguyên, cờ thiếu thành off", () => {
    const body = { flags: { ux_pd_cai_dat: { mode: "allowlist", organizationIds: ["org-1"] }, ux_pd_noi_dung: { mode: "all" } } }
    expect(uxRolloutFlagsBody.safeParse(body).success).toBe(true)
    const parsed = parseUxRolloutFlags(body.flags)
    expect(parsed.ux_pd_cai_dat).toEqual({ mode: "allowlist", organizationIds: ["org-1"] })
    expect(parsed.ux_pd_noi_dung).toEqual({ mode: "all", organizationIds: [] })
    expect(parsed.ux_pd_anh_san_pham).toEqual({ mode: "off", organizationIds: [] })
  })

  it("cờ giao diện: cờ lạ hoặc chế độ lạ — lược đồ báo sai, hàm parse về off/bỏ qua", () => {
    expect(uxRolloutFlagsBody.safeParse({ flags: { co_la: { mode: "all" } } }).success).toBe(false)
    expect(uxRolloutFlagsBody.safeParse({ flags: { ux_pd_cai_dat: { mode: "bat" } } }).success).toBe(false)
    expect(parseUxRolloutFlags({ ux_pd_cai_dat: { mode: "bat" } }).ux_pd_cai_dat).toEqual({ mode: "off", organizationIds: [] })
  })
})
