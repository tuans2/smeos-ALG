import { describe, expect, it } from "vitest"

import { NEXT_ACTIONS_REGISTRY } from "@/modules/journey/domain/next-actions-registry"
import { pageExists as exists } from "../../helpers/page-routes"

/** UJ-05 (audit hành trình 06/11/2026, N1): gợi ý bước tiếp theo của hành trình phải trỏ tới trang có thật. */
describe("gợi ý bước tiếp theo trỏ tới trang có thật", () => {
  it("gợi ý bước tiếp theo của hành trình", () => {
    const broken = Object.values(NEXT_ACTIONS_REGISTRY)
      .flat()
      .filter((a) => a.targetHref && !exists(a.targetHref))
      .map((a) => `${a.label} → ${a.targetHref}`)
    expect(broken).toEqual([])
  })
})
