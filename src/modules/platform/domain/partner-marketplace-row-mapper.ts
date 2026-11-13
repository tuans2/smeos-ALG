/**
 * Ánh xạ một dòng khảo sát (Google Sheet / Excel, 75 cột A→BW) thành hồ sơ đối tác.
 * Thuần: không import hạ tầng. Cột 0 là dấu thời gian, cột 74 là ghi chú thêm.
 */
import type { PartnerStoreMarketplaceEntity } from "./partner-marketplace.types"
import { remapRow, type ColumnMapping } from "./partner-marketplace-column-match"

export type PartnerStoreProfile = Omit<PartnerStoreMarketplaceEntity, "id">

export const DEFAULT_TIER = "Hạng Tiêu Chuẩn"

/** PO 31/10/2026: "Hạng Tăng trưởng" gộp vào "Hạng Tiêu Chuẩn". Khoá viết thường. */
const MERGED_TIERS: Readonly<Record<string, string>> = {
  "hạng tăng trưởng": DEFAULT_TIER,
  "hạng tiêu chuẩn": DEFAULT_TIER,
}

/** Hạng hiển thị: trống → mặc định; hạng đã gộp → hạng đích. */
export function normalizeTier(raw: string | undefined | null): string {
  const t = (raw ?? "").normalize("NFC").trim()
  if (!t) return DEFAULT_TIER
  return MERGED_TIERS[t.toLowerCase()] ?? t
}
export const SURVEY_COLUMN_COUNT = 75
/** Trần số cột đọc từ tệp nhập — tệp có thể thêm cột ngoài 75 cột gốc. */
export const MAX_IMPORT_COLUMNS = 200
/** Trần số dòng mỗi lần nhập — vòng lặp và bộ nhớ luôn có giới hạn. */
export const MAX_IMPORT_ROWS = 5000
/** Số ảnh khảo sát tối đa mỗi cửa hàng được tải và hiển thị. */
export const MAX_PHOTOS_PER_STORE = 12

/**
 * Ảnh xem trước trực tiếp từ Drive (chỉ chạy với tệp chia sẻ công khai) — dùng khi
 * ảnh chưa được tải vào kho, để hồ sơ luôn có ảnh.
 */
export function driveThumbnailUrl(driveId: string, width = 1000): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w${width}`
}

const EMPTY_LIST = new Set(["", "không", "không có"])

export function splitList(val: string): string[] {
  if (EMPTY_LIST.has(val.trim().toLowerCase())) return []
  return val
    .split(/[,;/]/)
    .map((v) => v.trim())
    .filter(Boolean)
}

/** Lấy Drive id từ chuỗi link (`?id=…` hoặc `/file/d/…`), bỏ trùng, giữ thứ tự. */
export function extractDriveIds(rawUrls: string): string[] {
  const ids = [...rawUrls.matchAll(/(?:[?&]id=|\/file\/d\/)([a-zA-Z0-9_-]{10,})/g)].map((m) => m[1]!)
  return [...new Set(ids)]
}

/** Khoá khớp khi đồng bộ lại: tên cửa hàng viết thường, gộp khoảng trắng. */
export function matchKeyOf(shopName: string): string {
  return shopName.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim()
}

export function rowToProfile(row: readonly unknown[]): PartnerStoreProfile | null {
  const c = (idx: number) => String(row[idx] ?? "").trim()
  const shopName = c(5)
  if (!shopName) return null
  const opt = (idx: number) => c(idx) || undefined
  const rawImageUrls = c(64)

  return {
    audit: { timestamp: c(0), specialist: c(1), surveyDate: c(2), surveyType: c(3), notes: opt(4) },
    identity: {
      shopName,
      legalName: opt(6),
      taxCode: opt(7),
      ownerName: c(8) || shopName,
      contactPerson: c(9),
      operatingYears: c(10),
      scale: c(11),
      legalCompliance: opt(12),
    },
    contact: { phone: c(13), email: opt(14), address: c(15), googleMaps: opt(16) },
    digital: {
      facebook: opt(17), tiktok: opt(18), website: opt(19), googleReview: opt(20),
      facebookFollowers: opt(21), tiktokFollowers: opt(22), postingFrequency: opt(23),
      onlineOrderChannels: opt(24), adsAndLivestream: opt(25),
    },
    business: {
      monthlyRevenue: opt(26), dailyOrdersNormal: opt(27), dailyOrdersPeak: opt(28), aov: opt(29),
      targetCustomers: opt(30), b2bShare: opt(31), customerSources: opt(32), paymentMethods: opt(33),
      challenges: opt(34), goals12m: opt(35), algExpectations: opt(36), cooperationWishes: opt(37),
    },
    production: {
      productLines: splitList(c(38)),
      mainProductLine: opt(39), floristCount: opt(40), leadFloristExperience: opt(41),
      maxCapacityNormal: opt(42), maxCapacityPeak: opt(43), flowerSupply: opt(44),
      mainFlowerSource: opt(45), importFrequency: opt(46), rareFlowerAbility: opt(47),
      inboundProcess: opt(48), freshnessDuration: opt(49), lossRateEstimate: opt(50),
      nearExpireHandling: opt(51),
    },
    facilityAndDelivery: {
      coolers: opt(52), coldStorage: opt(53), premises: opt(54), space: opt(55), equipment: opt(56),
      staffing: opt(57), deliveryVehicles: opt(58), deliveryRadius: opt(59),
      deliveryCommitmentTime: opt(60), coldDeliveryAbility: opt(61), deliveryFeePolicy: opt(62),
    },
    media: {
      requiredPhotoTypes: opt(63),
      rawImageUrls: rawImageUrls || undefined,
      driveImageIds: extractDriveIds(rawImageUrls),
      requiredDocuments: opt(65),
    },
    scoreAndTier: {
      skillAndCraftScore: opt(66), processFacilityScore: opt(67), supplyStorageScore: opt(68),
      productionDeliveryScore: opt(69), legalDigitalScore: opt(70), disciplineCooperationScore: opt(71),
      totalScore: opt(72),
      suggestedTier: normalizeTier(c(73)),
      additionalNotes: opt(74),
    },
  }
}

/**
 * Chuyển bảng (dòng 0 là tiêu đề) thành hồ sơ; dòng trống/thiếu tên bị bỏ, tên trùng giữ dòng sau.
 * Có `mapping` → lấy cột theo bảng ghép (tệp lệch cột); không có → theo thứ tự cột gốc.
 */
export function rowsToProfiles(
  rows: readonly (readonly unknown[])[],
  mapping?: ColumnMapping
): { profiles: PartnerStoreProfile[]; skipped: number } {
  const byKey = new Map<string, PartnerStoreProfile>()
  let skipped = 0
  const data = rows.slice(1, MAX_IMPORT_ROWS + 1)
  data.forEach((row) => {
    if (!row.some((cell) => String(cell ?? "").trim())) return
    const profile = rowToProfile(mapping ? remapRow(row, mapping) : row)
    if (!profile) {
      skipped++
      return
    }
    byKey.set(matchKeyOf(profile.identity.shopName), profile)
  })
  return { profiles: [...byKey.values()], skipped }
}

/** Chuỗi tìm kiếm "mọi trường": giá trị (không lấy tên khoá, không lấy link ảnh), viết thường. */
export function searchTextOf(profile: PartnerStoreProfile): string {
  const values: string[] = []
  const walk = (v: unknown, key = ""): void => {
    if (key === "rawImageUrls" || key === "driveImageIds" || key === "coverPhotoUrl" || key === "photoGalleryUrls") return
    if (Array.isArray(v)) v.forEach((x) => walk(x))
    else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => walk(x, k))
    else if (v !== undefined && v !== null && String(v).trim()) values.push(String(v).trim())
  }
  walk(profile)
  return values.join(" • ").toLowerCase()
}
