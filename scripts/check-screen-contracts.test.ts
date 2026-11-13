import { describe, expect, it } from "vitest"

import { contractCheckFailures, runContractCheck } from "./check-screen-contracts"

describe("check:screen-contracts --check", () => {
  it("đỏ khi có trang thiếu contract hoặc chỉ có contract v1", () => {
    expect(contractCheckFailures({ missing: 0, coveredV1: 0 })).toEqual([])
    expect(contractCheckFailures({ missing: 2, coveredV1: 0 })).toHaveLength(1)
    expect(contractCheckFailures({ missing: 0, coveredV1: 1 })).toHaveLength(1)
    expect(contractCheckFailures({ missing: 1, coveredV1: 1 })).toHaveLength(2)
  })

  it("repo hiện tại: mọi trang có contract v2 hoặc miễn trừ", () => {
    const report = runContractCheck()
    expect(contractCheckFailures(report)).toEqual([])
    expect(report.coveredV2 + report.exempt).toBe(report.totalRoutes)
  })
})
