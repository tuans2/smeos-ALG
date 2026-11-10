import { describe, expect, it } from "vitest"

import { requestKey } from "./request-key"

describe("requestKey — khoá idempotency theo yêu cầu", () => {
  let n = 0
  const mint = () => `k${++n}`

  it("chưa có khoá → khoá mới; cùng yêu cầu thử lại → giữ khoá; đổi yêu cầu → khoá mới", () => {
    const first = requestKey(null, "sp-1|facebook,zalo", mint)
    expect(requestKey(first, "sp-1|facebook,zalo", mint)).toBe(first)
    const changed = requestKey(first, "sp-1|facebook", mint)
    expect(changed.key).not.toBe(first.key)
    expect(changed.sig).toBe("sp-1|facebook")
  })
})
