import { describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import { getEntryActions, updateEntryActions } from "../entry-actions-settings"

const ctx = { organizationId: "org-1", userId: "u-1", capabilities: new Set<string>() } as unknown as TenantContext

function repo(settings: Record<string, unknown> | null = { other: 1 }) {
  return {
    current: vi.fn(async () => ({ id: "org-1", settings })),
    updateSettings: vi.fn(async () => undefined),
  } as never as Parameters<typeof getEntryActions>[1] & { updateSettings: ReturnType<typeof vi.fn> }
}

describe("cài đặt nút Đặt hàng / Liên hệ", () => {
  it("chưa cài: Thẻ chào chỉ Đặt hàng, catalog và landing có cả hai", async () => {
    const v = await getEntryActions(ctx, repo(null))
    const byCode = Object.fromEntries(v.sources.map((s) => [s.code, s.effective]))
    expect(byCode.BROCHURE).toEqual({ order: true, contact: false })
    expect(byCode.CATALOG).toEqual({ order: true, contact: true })
    expect(byCode.LANDING).toEqual({ order: true, contact: true })
  })

  it("lưu: giữ nguyên các cài đặt khác của tổ chức và ghi nhật ký", async () => {
    const r = repo()
    const audit = vi.fn(async () => undefined)
    await updateEntryActions(ctx, { bySource: { LANDING: { order: false } } }, r, audit as never)
    expect(r.updateSettings).toHaveBeenCalledWith(ctx, { other: 1, order_entry_actions: { default: {}, bySource: { LANDING: { order: false } } } })
    expect(audit).toHaveBeenCalledWith(ctx, expect.objectContaining({ action: "orders.entry_actions_updated" }))
  })

  it("tắt cả hai nút của một nguồn → 422, không lưu", async () => {
    const r = repo()
    await expect(updateEntryActions(ctx, { bySource: { CATALOG: { order: false, contact: false } } }, r, vi.fn() as never)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(r.updateSettings).not.toHaveBeenCalled()
  })
})
