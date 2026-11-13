import { describe, expect, it } from "vitest"
import {
  calculateHaversineDistanceKm,
  calculateTotalScore,
  matchCandidateBranches,
  scoreDistance,
  scoreWorkload,
  type BranchCandidate,
} from "../chain-dispatch-engine"
import { DEFAULT_CHAIN_DISPATCH_POLICY } from "../chain-dispatch-policy"

describe("chain-dispatch-engine", () => {
  it("calculateHaversineDistanceKm tính chính xác khoảng cách giữa 2 điểm toạ độ thực tế", () => {
    // Chợ Bến Thành (10.7721, 106.6983) đến Landmark 81 (10.7951, 106.7219) ~ 3.6 km
    const benThanh = { latitude: 10.7721, longitude: 106.6983 }
    const landmark81 = { latitude: 10.7951, longitude: 106.7219 }

    const dist = calculateHaversineDistanceKm(benThanh, landmark81)
    expect(dist).toBeGreaterThan(3.0)
    expect(dist).toBeLessThan(4.5)
  })

  it("scoreDistance chuyển đổi khoảng cách sang điểm số hợp lý", () => {
    expect(scoreDistance(0, 20)).toBe(100)
    expect(scoreDistance(10, 20)).toBe(50)
    expect(scoreDistance(20, 20)).toBe(0)
    expect(scoreDistance(25, 20)).toBe(0)
    expect(scoreDistance(null, 20)).toBe(50) // Fallback khi không có GPS
  })

  it("scoreWorkload phản ánh chính xác độ sẵn sàng nhận việc", () => {
    expect(scoreWorkload(0, 10)).toBe(100) // Rảnh 100%
    expect(scoreWorkload(5, 10)).toBe(50) // Đang làm 50%
    expect(scoreWorkload(10, 10)).toBe(0) // Quá tải, hết chỗ
    expect(scoreWorkload(12, 10)).toBe(0) // Vượt tải
  })

  it("calculateTotalScore kết hợp trọng số chuẩn theo cấu hình", () => {
    const scores = { distanceScore: 80, qualityScore: 90, workloadScore: 50 }
    const weights = { distance: 50, qualityScore: 30, workload: 20 }
    // 80*50 + 90*30 + 50*20 = 4000 + 2700 + 1000 = 7700 / 100 = 77.0
    expect(calculateTotalScore(scores, weights)).toBe(77.0)
  })

  it("matchCandidateBranches lọc chính xác chi nhánh không đủ điều kiện và xếp hạng Top N", () => {
    const orderLocation = { latitude: 10.7721, longitude: 106.6983 }

    const branches: BranchCandidate[] = [
      {
        branchId: "branch-q1",
        branchName: "Chi nhánh Quận 1 (Gần, chất lượng cao, rảnh việc)",
        location: { latitude: 10.775, longitude: 106.701 }, // ~0.4 km
        qualityScore: 95,
        activeJobsCount: 1,
        maxConcurrentJobs: 10,
        isActive: true,
      },
      {
        branchId: "branch-q3",
        branchName: "Chi nhánh Quận 3 (Khá gần, chất lượng khá)",
        location: { latitude: 10.785, longitude: 106.685 }, // ~2 km
        qualityScore: 85,
        activeJobsCount: 3,
        maxConcurrentJobs: 10,
        isActive: true,
      },
      {
        branchId: "branch-binh-thanh",
        branchName: "Chi nhánh Bình Thạnh",
        location: { latitude: 10.805, longitude: 106.71 }, // ~4 km
        qualityScore: 90,
        activeJobsCount: 2,
        maxConcurrentJobs: 10,
        isActive: true,
      },
      {
        branchId: "branch-thu-duc",
        branchName: "Chi nhánh Thủ Đức (Xa hơn)",
        location: { latitude: 10.85, longitude: 106.75 }, // ~12 km
        qualityScore: 88,
        activeJobsCount: 0,
        maxConcurrentJobs: 5,
        isActive: true,
      },
      {
        branchId: "branch-overloaded",
        branchName: "Chi nhánh Quá Tải",
        location: { latitude: 10.773, longitude: 106.699 },
        qualityScore: 99,
        activeJobsCount: 5,
        maxConcurrentJobs: 5, // Đầy tải!
        isActive: true,
      },
      {
        branchId: "branch-inactive",
        branchName: "Chi nhánh Tạm Nghỉ",
        location: { latitude: 10.773, longitude: 106.699 },
        qualityScore: 90,
        activeJobsCount: 0,
        maxConcurrentJobs: 10,
        isActive: false, // Nghỉ!
      },
    ]

    const result = matchCandidateBranches(orderLocation, branches, {
      ...DEFAULT_CHAIN_DISPATCH_POLICY,
      topN: 3,
    })

    // Chi nhánh Quá Tải và Chi nhánh Tạm Nghỉ phải bị loại
    expect(result.allRanked.find((b) => b.branch.branchId === "branch-overloaded")).toBeUndefined()
    expect(result.allRanked.find((b) => b.branch.branchId === "branch-inactive")).toBeUndefined()

    // Top 3 được chọn
    expect(result.topCandidates).toHaveLength(3)
    // Chi nhánh Q1 phải đứng đầu vì gần nhất và chất lượng cao nhất
    expect(result.topCandidates[0]!.branch.branchId).toBe("branch-q1")
    expect(result.topCandidates[0]!.rank).toBe(1)
    expect(result.hasMoreCandidates).toBe(true) // Còn chi nhánh Thủ Đức
  })

  it("matchCandidateBranches loại bỏ các chi nhánh đã nằm trong danh sách excludedBranchIds", () => {
    const branches: BranchCandidate[] = [
      {
        branchId: "b1",
        branchName: "Chi nhánh 1",
        qualityScore: 90,
        activeJobsCount: 0,
        maxConcurrentJobs: 10,
        isActive: true,
      },
      {
        branchId: "b2",
        branchName: "Chi nhánh 2",
        qualityScore: 85,
        activeJobsCount: 0,
        maxConcurrentJobs: 10,
        isActive: true,
      },
    ]

    const result = matchCandidateBranches(null, branches, DEFAULT_CHAIN_DISPATCH_POLICY, {
      excludedBranchIds: ["b1"],
      round: 2,
    })

    expect(result.topCandidates).toHaveLength(1)
    expect(result.topCandidates[0]!.branch.branchId).toBe("b2")
    expect(result.round).toBe(2)
  })
})
