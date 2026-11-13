import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { districtNames, guessAddressSystem, provinceNames, wardNames, type AddressUnitsData } from "../vn-address-units"

const load = (system: "old" | "new") =>
  ({ system, provinces: JSON.parse(readFileSync(join(process.cwd(), "public/data/vn-address", `${system}.json`), "utf8")).provinces }) as AddressUnitsData

describe("dữ liệu địa chỉ hai hệ", () => {
  it("hệ cũ đủ 63 tỉnh, 696 quận/huyện, 10.051 phường/xã", () => {
    const old = load("old")
    if (old.system !== "old") throw new Error("sai hệ")
    expect(old.provinces).toHaveLength(63)
    expect(old.provinces.reduce((n, p) => n + p[1].length, 0)).toBe(696)
    expect(old.provinces.reduce((n, p) => n + p[1].reduce((m, d) => m + d[1].length, 0), 0)).toBe(10051)
  })

  it("hệ mới đủ 34 tỉnh, 3.321 phường/xã, không có quận/huyện", () => {
    const neu = load("new")
    expect(provinceNames(neu)).toHaveLength(34)
    expect(provinceNames(neu).reduce((n, p) => n + wardNames(neu, p).length, 0)).toBe(3321)
    expect(districtNames(neu, "Thành phố Hồ Chí Minh")).toEqual([])
  })

  it("chọn theo tầng: tỉnh → quận → phường (cũ), tỉnh → phường (mới)", () => {
    const old = load("old")
    expect(districtNames(old, "Thành phố Hồ Chí Minh")).toContain("Quận 1")
    expect(wardNames(old, "Thành phố Hồ Chí Minh", "Quận 1")).toContain("Phường Bến Thành")
    expect(wardNames(old, "Thành phố Hồ Chí Minh")).toEqual([])
    expect(wardNames(load("new"), "Thành phố Hồ Chí Minh")).toContain("Phường Bến Thành")
  })

  it("đoán hệ của địa chỉ có sẵn, mặc định là hệ cũ", () => {
    expect(guessAddressSystem({})).toBe("old")
    expect(guessAddressSystem({ province: "Thành phố Hà Nội", district: "Quận Ba Đình" })).toBe("old")
    expect(guessAddressSystem({ province: "Tỉnh Bình Dương" })).toBe("old")
    expect(guessAddressSystem({ province: "Cao Bằng" })).toBe("new")
  })
})
