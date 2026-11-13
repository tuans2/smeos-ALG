import { describe, expect, it } from "vitest"

import {
  ORDER_ENTRY_ACTIONS_SETTINGS_KEY,
  parseEntryActionsSettings,
  resolveEntryActions,
  validateEntryActionsSettings,
} from "../entry-actions"

const settingsOf = (value: unknown) => parseEntryActionsSettings({ [ORDER_ENTRY_ACTIONS_SETTINGS_KEY]: value })

describe("nút Đặt hàng / Liên hệ — bật tắt theo toàn bộ hoặc từng nguồn", () => {
  it("chưa cài gì: nguồn mới hiện cả hai nút", () => {
    expect(resolveEntryActions({}, "LANDING")).toEqual({ order: true, contact: true })
    expect(resolveEntryActions({}, "CATALOG")).toEqual({ order: true, contact: true })
  })

  it("Thẻ chào mặc định chỉ có Đặt hàng — trang khách y như hiện nay (B1)", () => {
    expect(resolveEntryActions({}, "BROCHURE")).toEqual({ order: true, contact: false })
    expect(resolveEntryActions(parseEntryActionsSettings(null), "BROCHURE")).toEqual({ order: true, contact: false })
  })

  it("cài cho toàn bộ áp lên mọi nguồn; cài riêng nguồn đè cài toàn bộ", () => {
    const s = settingsOf({ default: { contact: false }, bySource: { LANDING: { contact: true, order: false } } })
    expect(resolveEntryActions(s, "CATALOG")).toEqual({ order: true, contact: false })
    expect(resolveEntryActions(s, "LANDING")).toEqual({ order: false, contact: true })
  })

  it("Điều hành chủ động bật Liên hệ cho Thẻ chào thì mới hiện", () => {
    expect(resolveEntryActions(settingsOf({ bySource: { BROCHURE: { contact: true } } }), "BROCHURE")).toEqual({ order: true, contact: true })
    expect(resolveEntryActions(settingsOf({ default: { contact: true } }), "BROCHURE")).toEqual({ order: true, contact: true })
  })

  it("bỏ khoá nguồn lạ và giá trị không phải boolean", () => {
    const s = settingsOf({ default: { order: "no" }, bySource: { FOO: { order: false }, CHAT: { contact: 1 } } })
    expect(s.default).toEqual({})
    expect(Object.keys(s.bySource ?? {})).toEqual(["CHAT"])
    expect(s.bySource?.CHAT).toEqual({})
  })

  it("không bao giờ để khách kẹt trang không nút nào", () => {
    const s = settingsOf({ default: { order: false, contact: false } })
    expect(resolveEntryActions(s, "CATALOG")).toEqual({ order: true, contact: false })
  })

  it("kiểm trước khi lưu: tắt cả hai nút bị từ chối, ở mức toàn bộ hoặc từng nguồn", () => {
    expect(validateEntryActionsSettings(settingsOf({ default: { order: false, contact: false } }))[0]?.source).toBe("default")
    expect(validateEntryActionsSettings(settingsOf({ bySource: { BROCHURE: { order: false } } })).map((e) => e.source)).toEqual(["BROCHURE"])
    expect(validateEntryActionsSettings(settingsOf({ bySource: { LANDING: { order: false } } }))).toEqual([])
  })
})
