import { describe, expect, it } from "vitest"
import { brochureEntryActions } from "../brochure-entry-actions"

describe("brochureEntryActions — công tắc Đặt hàng / Liên hệ của Bộ sưu tập riêng", () => {
  it("chưa cài gì → Đặt hàng bật, Liên hệ tắt (giữ như trước)", () => {
    expect(brochureEntryActions(null)).toEqual({ order: true, contact: false })
    expect(brochureEntryActions({})).toEqual({ order: true, contact: false })
  })

  it("cài chung cho mọi nguồn được áp dụng", () => {
    expect(brochureEntryActions({ order_entry_actions: { default: { contact: true } } })).toEqual({ order: true, contact: true })
  })

  it("cài riêng nguồn Bộ sưu tập riêng thắng cài chung", () => {
    const settings = { order_entry_actions: { default: { contact: false }, bySource: { BROCHURE: { order: false, contact: true } } } }
    expect(brochureEntryActions(settings)).toEqual({ order: false, contact: true })
  })

  it("không ảnh hưởng bởi cài riêng của Bộ sưu tập chung", () => {
    expect(brochureEntryActions({ order_entry_actions: { bySource: { CATALOG: { order: false, contact: true } } } })).toEqual({ order: true, contact: false })
  })

  it("tắt cả hai → vẫn bật lại Đặt hàng để khách không bị kẹt", () => {
    const settings = { order_entry_actions: { bySource: { BROCHURE: { order: false, contact: false } } } }
    expect(brochureEntryActions(settings)).toEqual({ order: true, contact: false })
  })
})
