import { describe, expect, it } from "vitest"

import { parsePhotoMatchJson } from "../photo-match-vision-adapter"

const defaults = { match: "khớp", mismatch: "không khớp" }

describe("parsePhotoMatchJson", () => {
  it("đọc kết luận hợp lệ, kẹp điểm trong 0–100", () => {
    expect(parsePhotoMatchJson('{"isMatch":true,"confidenceScore":120,"verdict":"MATCH","reason":"ok"}', defaults))
      .toEqual({ isMatch: true, confidenceScore: 100, verdict: "MATCH", reason: "ok" })
  })

  it("isMatch=true nhưng verdict MISMATCH → MISMATCH; thiếu lý do → câu mặc định", () => {
    expect(parsePhotoMatchJson('{"isMatch":true,"verdict":"MISMATCH"}', defaults)?.verdict).toBe("MISMATCH")
    expect(parsePhotoMatchJson('{"isMatch":false}', defaults)).toEqual({ isMatch: false, confidenceScore: 0, verdict: "MISMATCH", reason: "không khớp" })
  })

  it("JSON hỏng hoặc thiếu isMatch → null (gateway coi là lỗi, không phải MATCH)", () => {
    expect(parsePhotoMatchJson("không phải json", defaults)).toBeNull()
    expect(parsePhotoMatchJson('{"confidenceScore":99}', defaults)).toBeNull()
  })
})
