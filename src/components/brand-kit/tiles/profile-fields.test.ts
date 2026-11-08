import { describe, expect, it } from "vitest"

import { evaluateProfileStep } from "@/modules/brand-kit/domain/brand-journey"
import { OPTIONAL_FIELDS, PROFILE_FIELDS, REQUIRED_FIELDS } from "./profile-fields"

describe("ô Bước 1 trên /cong-cu", () => {
  it("8 ô cần có trùng đúng các mục máy chủ dùng để mở khoá Bộ nhận diện", () => {
    const serverKeys = evaluateProfileStep({ business: null, brand: null }).items.map((i) => i.key)
    expect([...REQUIRED_FIELDS]).toEqual(serverKeys)
  })

  it("mọi ô đều có nhãn tiếng Việt và nơi lưu; ô tuỳ chọn không trùng ô cần có", () => {
    for (const k of [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]) {
      expect(PROFILE_FIELDS[k].label.length).toBeGreaterThan(0)
      expect(["BUSINESS", "BRAND"]).toContain(PROFILE_FIELDS[k].target)
    }
    expect(OPTIONAL_FIELDS.filter((k) => REQUIRED_FIELDS.includes(k))).toEqual([])
  })
})
