import { describe, expect, it } from "vitest"
import { resolveStoryGesture } from "../use-story-nav"

describe("điều hướng kiểu Facebook Story", () => {
  it("chạm 2/3 bên phải → mẫu sau, 1/3 bên trái → mẫu trước", () => {
    expect(resolveStoryGesture(0, 0, 0.9)).toBe("next")
    expect(resolveStoryGesture(2, -3, 0.4)).toBe("next")
    expect(resolveStoryGesture(0, 0, 0.2)).toBe("previous")
  })

  it("vuốt sang trái → mẫu sau, vuốt sang phải → mẫu trước", () => {
    expect(resolveStoryGesture(-80, 10, 0.5)).toBe("next")
    expect(resolveStoryGesture(90, -5, 0.5)).toBe("previous")
  })

  it("kéo ngắn hoặc cuộn dọc → không chuyển mẫu", () => {
    expect(resolveStoryGesture(-30, 0, 0.9)).toBeNull()
    expect(resolveStoryGesture(-60, 200, 0.9)).toBeNull()
  })
})
