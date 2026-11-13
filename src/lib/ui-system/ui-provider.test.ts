import { describe, expect, it } from "vitest"
import { DEFAULT_UI_CONFIG } from "./presets"
import { readStoredDensity, UI_DENSITY_STORAGE_KEY, withStoredDensity, writeStoredDensity } from "./ui-provider"

describe("UiSystemProvider: density đọc từ localStorage", () => {
  it("giữ nguyên object config khi density trùng, để context không đổi ngay sau hydrate", () => {
    const prev = { ...DEFAULT_UI_CONFIG, density: "comfortable" as const }
    expect(withStoredDensity(prev, "comfortable")).toBe(prev)
  })

  it("trả config mới khi density khác", () => {
    const prev = { ...DEFAULT_UI_CONFIG, density: "comfortable" as const }
    const next = withStoredDensity(prev, "compact")
    expect(next).not.toBe(prev)
    expect(next).toEqual({ ...prev, density: "compact" })
  })
})

describe("UiSystemProvider: đọc density cá nhân", () => {
  const storage = (value: string | null, fail = false) => ({
    getItem: (key: string) => {
      if (fail) throw new Error("blocked")
      return key === UI_DENSITY_STORAGE_KEY ? value : null
    },
  })

  it("trả density hợp lệ người dùng đã lưu", () => {
    expect(readStoredDensity(storage("compact"))).toBe("compact")
    expect(readStoredDensity(storage("comfortable"))).toBe("comfortable")
  })

  it("trả null khi chưa lưu, giá trị lạ hoặc không đọc được localStorage", () => {
    expect(readStoredDensity(storage(null))).toBeNull()
    expect(readStoredDensity(storage("tiny"))).toBeNull()
    expect(readStoredDensity(storage("compact", true))).toBeNull()
  })
})

describe("UiSystemProvider: chỉ lưu density người dùng tự chọn", () => {
  it("không đọc khoá cũ bị ghi tự động (sẽ đè density máy chủ chọn theo tầng)", () => {
    expect(UI_DENSITY_STORAGE_KEY).not.toBe("smeos_ui_density")
  })

  it("ghi lựa chọn và xoá khi khôi phục mặc định", () => {
    const store = new Map<string, string>()
    const storage = {
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
    writeStoredDensity("compact", storage)
    expect(store.get(UI_DENSITY_STORAGE_KEY)).toBe("compact")
    writeStoredDensity(null, storage)
    expect(store.has(UI_DENSITY_STORAGE_KEY)).toBe(false)
  })

  it("bỏ qua khi localStorage bị chặn", () => {
    const blocked = {
      setItem: () => { throw new Error("blocked") },
      removeItem: () => { throw new Error("blocked") },
    }
    expect(() => writeStoredDensity("compact", blocked)).not.toThrow()
    expect(() => writeStoredDensity(null, blocked)).not.toThrow()
  })
})
