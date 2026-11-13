import { describe, expect, it } from "vitest"

import { fromScopeKey, PLATFORM_SCOPE_KEY, toScopeKey } from "./scope-key"

describe("địa chỉ phạm vi D-T5 (ADR-012 T-6b)", () => {
  it("dạng domain → dạng lưu", () => {
    expect(toScopeKey("GLOBAL")).toBe(PLATFORM_SCOPE_KEY)
    expect(toScopeKey("platform")).toBe("platform")
    expect(toScopeKey("industry:FLORAL")).toBe("industry:FLORAL")
    expect(toScopeKey("org-1")).toBe("org:org-1")
    expect(toScopeKey("org:org-1")).toBe("org:org-1")
    expect(toScopeKey("branch:b-1")).toBe("branch:b-1")
  })

  it("dạng lưu (và dòng cũ) → dạng domain", () => {
    expect(fromScopeKey("platform")).toBe("GLOBAL")
    expect(fromScopeKey("GLOBAL")).toBe("GLOBAL")
    expect(fromScopeKey("org:org-1")).toBe("org-1")
    expect(fromScopeKey("org-1")).toBe("org-1")
    expect(fromScopeKey("industry:FLORAL")).toBe("industry:FLORAL")
  })
})
