import { describe, expect, it, vi } from "vitest"
import { resolvePublicChatSlot } from "@/modules/chat-assistant/use-cases/resolve-public-chat-slot"

const owner = { organizationId: "org-1", shopSlug: "hoa-cuc", shopName: "Hoa Cúc" }

describe("resolvePublicChatSlot", () => {
  it("không tìm được tiệm → không vẽ", async () => {
    const read = vi.fn()
    expect(await resolvePublicChatSlot(null, "catalog", read)).toBeNull()
    expect(read).not.toHaveBeenCalled()
  })

  it("catalog chưa cấu hình → bật mặc định, vẽ với slug thật", async () => {
    const slot = await resolvePublicChatSlot(owner, "catalog", async () => null)
    expect(slot).toEqual({ shopSlug: "hoa-cuc", shopName: "Hoa Cúc", surface: "catalog" })
  })

  it("landing page chưa bật kênh → không vẽ", async () => {
    expect(await resolvePublicChatSlot(owner, "landing_page", async () => null)).toBeNull()
  })

  it("chủ tiệm tắt kênh → không vẽ", async () => {
    const read = async () => ({ isEnabled: false, config: {} })
    expect(await resolvePublicChatSlot(owner, "store_profile", read)).toBeNull()
  })

  it("chủ tiệm tắt riêng loại trang này → không vẽ; trang khác vẫn vẽ", async () => {
    const read = async () => ({ isEnabled: true, config: { publicSurfaces: ["catalog"] } })
    expect(await resolvePublicChatSlot(owner, "sales_link", read)).toBeNull()
    expect(await resolvePublicChatSlot(owner, "catalog", read)).not.toBeNull()
  })

  it("đọc đúng kênh theo loại trang", async () => {
    const read = vi.fn(async () => ({ isEnabled: true, config: {} }))
    await resolvePublicChatSlot(owner, "landing_page", read)
    expect(read).toHaveBeenCalledWith("org-1", "LANDING_PAGE")
  })
})
