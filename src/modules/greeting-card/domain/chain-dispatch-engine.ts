/**
 * chain-dispatch-engine.ts
 *
 * Thuật toán Lọc, Chấm điểm và Xếp hạng Chi nhánh Tự động (Matching & Scoring Engine).
 * Clean Architecture — Pure TypeScript, độc lập với cơ sở dữ liệu.
 */

import type { ChainDispatchPolicy } from "./chain-dispatch-policy"
import { AREA_MATCH_SCORE, matchArea, type AdministrativeArea, type AreaMatchLevel, type BranchArea } from "./area-match"

export interface GeoCoordinate {
  latitude: number
  longitude: number
}

export interface BranchChannelConfig {
  telegramChatId?: string | null | undefined
  zaloPhone?: string | null | undefined
  /** Zalo user id của nhân viên chi nhánh trên OA chung (liên kết bằng mã qua OA) */
  zaloUserId?: string | null | undefined
  messengerId?: string | null | undefined
  phone?: string | null | undefined
}

export interface BranchCandidate {
  branchId: string
  branchName: string
  location?: GeoCoordinate | null | undefined
  address?: string | null | undefined
  /** Phường / quận / tỉnh của chi nhánh — dùng khi không tính được khoảng cách theo toạ độ */
  area?: BranchArea | null | undefined
  /** Điểm đánh giá chất lượng từ 0 đến 100 */
  qualityScore: number
  /** Số đơn hàng hiện đang thực hiện tại chi nhánh */
  activeJobsCount: number
  /** Giới hạn số đơn cùng làm tối đa */
  maxConcurrentJobs: number
  /** Trạng thái chi nhánh có đang nhận việc hay không */
  isActive: boolean
  /** Các kênh kết nối tự động (Telegram, Zalo, Messenger) */
  channels?: BranchChannelConfig | undefined
  /** Cửa hàng đối tác (tổ chức riêng) mà ứng viên này đại diện — nhận thêm thẻ mời trong Trao đổi nội bộ (D9) */
  partnerOrgId?: string | null | undefined
}

export interface ScoredBranch {
  branch: BranchCandidate
  distanceKm: number | null
  /** Mức khớp khu vực — chỉ có khi không tính được khoảng cách theo toạ độ */
  areaMatch: AreaMatchLevel | null
  distanceScore: number
  qualityScore: number
  workloadScore: number
  totalScore: number
  rank: number
}

export interface MatchBranchesOptions {
  /** Danh sách chi nhánh đã từ chối, đã hủy hoặc đã mời ở các vòng trước */
  excludedBranchIds?: string[] | undefined
  /** Vòng phân bổ hiện tại (Bắt đầu từ 1) */
  round?: number | undefined
  /** Phường / quận / tỉnh của người nhận — sàng lọc khi thiếu toạ độ */
  orderArea?: AdministrativeArea | null | undefined
}

export interface MatchBranchesResult {
  topCandidates: ScoredBranch[]
  round: number
  hasMoreCandidates: boolean
  totalEligible: number
  allRanked: ScoredBranch[]
}

/**
 * Tính khoảng cách đường chim bay giữa 2 toạ độ theo công thức Haversine (đơn vị: Km).
 */
export function calculateHaversineDistanceKm(
  coord1: GeoCoordinate,
  coord2: GeoCoordinate
): number {
  const R = 6371 // Bán kính Trái Đất tính bằng Km
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180
  const lat1 = (coord1.latitude * Math.PI) / 180
  const lat2 = (coord2.latitude * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(R * c * 10) / 10 // Làm tròn 1 chữ số thập phân
}

/**
 * Chuyển đổi khoảng cách thành điểm số từ 0 - 100.
 * Khoảng cách càng gần thì điểm càng cao (0km = 100 điểm, >= maxRadiusKm = 0 điểm).
 */
export function scoreDistance(distanceKm: number | null, maxRadiusKm: number): number {
  if (distanceKm === null || maxRadiusKm <= 0) return 50 // Nếu không có toạ độ, cho điểm trung bình
  if (distanceKm <= 0) return 100
  if (distanceKm >= maxRadiusKm) return 0
  return Math.max(0, Math.min(100, Math.round((1 - distanceKm / maxRadiusKm) * 100)))
}

/**
 * Chuyển đổi mức độ tải đơn thành điểm số từ 0 - 100.
 * Càng ít việc đang làm dở thì điểm sẵn sàng nhận việc càng cao.
 */
export function scoreWorkload(activeJobs: number, maxJobs: number): number {
  if (maxJobs <= 0) return 0
  if (activeJobs >= maxJobs) return 0
  const availableRatio = (maxJobs - activeJobs) / maxJobs
  return Math.max(0, Math.min(100, Math.round(availableRatio * 100)))
}

/**
 * Tính tổng điểm có trọng số theo tiêu chuẩn cấu hình ChainDispatchPolicy.
 */
export function calculateTotalScore(
  scores: { distanceScore: number; qualityScore: number; workloadScore: number },
  weights: ChainDispatchPolicy["scoringWeights"]
): number {
  const sumWeights = weights.distance + weights.qualityScore + weights.workload
  if (sumWeights <= 0) return 0

  const weightedSum =
    scores.distanceScore * weights.distance +
    scores.qualityScore * weights.qualityScore +
    scores.workloadScore * weights.workload

  return Math.round((weightedSum / sumWeights) * 10) / 10
}

/**
 * Hàm cốt lõi: Quét danh sách chi nhánh, lọc điều kiện tiên quyết,
 * chấm điểm đa tiêu chí và trả về Top N chi nhánh tốt nhất cho đơn hàng.
 */
export function matchCandidateBranches(
  orderLocation: GeoCoordinate | null | undefined,
  branches: BranchCandidate[],
  policy: ChainDispatchPolicy,
  options: MatchBranchesOptions = {}
): MatchBranchesResult {
  const round = Math.max(1, options.round ?? 1)
  const excludedSet = new Set(options.excludedBranchIds ?? [])

  // 1. Lọc điều kiện tiên quyết (Prerequisites)
  const eligibleBranches = branches.filter((branch) => {
    // Phải đang hoạt động
    if (!branch.isActive) return false
    // Không nằm trong danh sách đã loại trừ (đã từ chối, đã huỷ, v.v.)
    if (excludedSet.has(branch.branchId)) return false
    // Chưa vượt quá công suất tối đa
    if (branch.activeJobsCount >= branch.maxConcurrentJobs && branch.maxConcurrentJobs > 0) {
      return false
    }

    // Nếu có toạ độ và cấu hình bán kính: không được vượt quá bán kính tối đa
    if (orderLocation && branch.location) {
      const dist = calculateHaversineDistanceKm(orderLocation, branch.location)
      if (dist > policy.maxRadiusKm) return false
      return true
    }

    // Không tính được khoảng cách: chi nhánh khác tỉnh với người nhận bị loại
    return matchArea(options.orderArea, branch.area) !== "OTHER_PROVINCE"
  })

  // 2. Chấm điểm từng chi nhánh hợp lệ
  const scoredList: ScoredBranch[] = eligibleBranches.map((branch) => {
    let distanceKm: number | null = null
    if (orderLocation && branch.location) {
      distanceKm = calculateHaversineDistanceKm(orderLocation, branch.location)
    }

    // Có toạ độ hai đầu → điểm theo km; không có → điểm theo mức khớp phường / quận / tỉnh
    const areaMatch = distanceKm === null ? matchArea(options.orderArea, branch.area) : null
    const distScore = areaMatch ? AREA_MATCH_SCORE[areaMatch] : scoreDistance(distanceKm, policy.maxRadiusKm)
    const qualScore = Math.max(0, Math.min(100, Math.round(branch.qualityScore)))
    const workScore = scoreWorkload(branch.activeJobsCount, branch.maxConcurrentJobs)

    const total = calculateTotalScore(
      { distanceScore: distScore, qualityScore: qualScore, workloadScore: workScore },
      policy.scoringWeights
    )

    return {
      branch,
      distanceKm,
      areaMatch,
      distanceScore: distScore,
      qualityScore: qualScore,
      workloadScore: workScore,
      totalScore: total,
      rank: 0,
    }
  })

  // 3. Sắp xếp giảm dần theo tổng điểm (ưu tiên điểm cao hơn, nếu bằng nhau thì ưu tiên khoảng cách gần hơn)
  scoredList.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    const distA = a.distanceKm ?? Number.MAX_SAFE_INTEGER
    const distB = b.distanceKm ?? Number.MAX_SAFE_INTEGER
    return distA - distB
  })

  // Đánh số thứ tự xếp hạng (rank)
  scoredList.forEach((item, index) => {
    item.rank = index + 1
  })

  // 4. Lấy Top N
  const topCandidates = scoredList.slice(0, policy.topN)
  const remainingCount = scoredList.length - topCandidates.length

  return {
    topCandidates,
    round,
    hasMoreCandidates: remainingCount > 0,
    totalEligible: scoredList.length,
    allRanked: scoredList,
  }
}
