import { describe, expect, it } from "vitest"

import {
  CAPABILITIES_NEVER_CROSSING_BOUNDARY,
  withoutBoundaryCapabilities,
} from "./boundary-capabilities"

describe("withoutBoundaryCapabilities", () => {
  it("trừ L5 — khối pricing không vượt ranh giới core", () => {
    const ket_qua = withoutBoundaryCapabilities(new Set(["L1", "L5", "J3"]))
    expect(ket_qua.has("L5")).toBe(false)
    expect(ket_qua.has("L1")).toBe(true)
    expect(ket_qua.has("J3")).toBe(true)
  })

  it("chỉ trừ, không bao giờ thêm", () => {
    const ket_qua = withoutBoundaryCapabilities(new Set(["L1"]))
    expect([...ket_qua]).toEqual(["L1"])
  })

  it("tập rỗng vẫn rỗng", () => {
    expect([...withoutBoundaryCapabilities(new Set())]).toEqual([])
  })

  it("không sửa tại chỗ tập truyền vào", () => {
    const goc = new Set(["L5", "L1"])
    withoutBoundaryCapabilities(goc)
    expect(goc.has("L5")).toBe(true)
  })

  it("danh sách chặn không rỗng — rỗng nghĩa là ranh giới không còn được cưỡng chế", () => {
    expect(CAPABILITIES_NEVER_CROSSING_BOUNDARY.length).toBeGreaterThan(0)
  })
})
