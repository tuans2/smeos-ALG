import { describe, expect, it } from "vitest"
import { matchArea, normalizeAreaName } from "../area-match"
import { matchCandidateBranches, type BranchCandidate } from "../chain-dispatch-engine"
import { DEFAULT_CHAIN_DISPATCH_POLICY } from "../chain-dispatch-policy"

describe("normalizeAreaName", () => {
  it("bỏ dấu, hoa thường, tiền tố và số 0 đầu", () => {
    expect(normalizeAreaName("Phường Bến Nghé")).toBe("ben nghe")
    expect(normalizeAreaName("P. Bến Nghé")).toBe("ben nghe")
    expect(normalizeAreaName("Phường 05")).toBe(normalizeAreaName("P5"))
    expect(normalizeAreaName("Quận 1")).toBe(normalizeAreaName("Q.1"))
    expect(normalizeAreaName("TP. Hồ Chí Minh")).toBe("ho chi minh")
    expect(normalizeAreaName("Thành phố Hồ Chí Minh")).toBe("ho chi minh")
    expect(normalizeAreaName("TP HCM")).toBe("ho chi minh")
    expect(normalizeAreaName("Đà Nẵng")).toBe("da nang")
  })

  it("không cắt nhầm đầu tên thật", () => {
    expect(normalizeAreaName("Phú Nhuận")).toBe("phu nhuan")
    expect(normalizeAreaName("Quảng Ngãi")).toBe("quang ngai")
    expect(normalizeAreaName("Phường Phú Nhuận")).toBe("phu nhuan")
    expect(normalizeAreaName("Tỉnh Quảng Ninh")).toBe("quang ninh")
  })
})

describe("matchArea", () => {
  const branch = { ward: "Phường Bến Nghé", district: "Quận 1", province: "TP. Hồ Chí Minh", serviceWards: ["Phường Đa Kao"] }

  it("cùng phường (kể cả phường phục vụ thêm) > cùng quận > cùng tỉnh", () => {
    expect(matchArea({ ward: "P. Bến Nghé", province: "Hồ Chí Minh" }, branch)).toBe("WARD")
    expect(matchArea({ ward: "Đa Kao", province: "TP HCM" }, branch)).toBe("WARD")
    expect(matchArea({ ward: "Tân Định", district: "Q1", province: "Hồ Chí Minh" }, branch)).toBe("DISTRICT")
    expect(matchArea({ ward: "Thảo Điền", province: "Hồ Chí Minh" }, branch)).toBe("PROVINCE")
  })

  it("khác tỉnh → loại, kể cả trùng tên phường", () => {
    expect(matchArea({ ward: "Bến Nghé", province: "Hà Nội" }, branch)).toBe("OTHER_PROVINCE")
  })

  it("thiếu dữ liệu → UNKNOWN, không đoán", () => {
    expect(matchArea(null, branch)).toBe("UNKNOWN")
    expect(matchArea({ ward: "Tân Định" }, branch)).toBe("UNKNOWN")
    expect(matchArea({ ward: "Bến Nghé", province: "Hồ Chí Minh" }, {})).toBe("UNKNOWN")
  })
})

describe("matchCandidateBranches — sàng lọc theo khu vực khi không có toạ độ", () => {
  const b = (id: string, area: BranchCandidate["area"], qualityScore = 90): BranchCandidate => ({
    branchId: id, branchName: id, area, qualityScore, activeJobsCount: 0, maxConcurrentJobs: 5, isActive: true,
  })
  const branches = [
    b("CUNG-TINH", { ward: "Thảo Điền", province: "Hồ Chí Minh" }, 100),
    b("CUNG-PHUONG", { ward: "Bến Nghé", province: "Hồ Chí Minh" }, 80),
    b("KHAC-TINH", { ward: "Bến Nghé", province: "Hà Nội" }, 100),
    b("CHUA-RO", null, 100),
  ]

  it("cùng phường lên đầu, khác tỉnh bị loại, chi nhánh chưa có khu vực xếp sau cùng tỉnh", () => {
    const res = matchCandidateBranches(null, branches, { ...DEFAULT_CHAIN_DISPATCH_POLICY, topN: 10 }, {
      orderArea: { ward: "Phường Bến Nghé", province: "TP. Hồ Chí Minh" },
    })
    expect(res.allRanked.map((r) => r.branch.branchId)).toEqual(["CUNG-PHUONG", "CUNG-TINH", "CHUA-RO"])
    expect(res.allRanked[0]?.areaMatch).toBe("WARD")
  })

  it("có toạ độ hai đầu → vẫn tính theo km, không dùng khu vực", () => {
    const withGps = [{ ...b("GPS", { province: "Hà Nội" }), location: { latitude: 10.776, longitude: 106.701 } }]
    const res = matchCandidateBranches({ latitude: 10.777, longitude: 106.702 }, withGps, DEFAULT_CHAIN_DISPATCH_POLICY, {
      orderArea: { ward: "Bến Nghé", province: "Hồ Chí Minh" },
    })
    expect(res.topCandidates[0]?.areaMatch).toBeNull()
    expect(res.topCandidates[0]?.distanceKm).not.toBeNull()
  })
})
