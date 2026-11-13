/**
 * Bộ lọc nhiều tiêu chí cho chợ đối tác (PO 31/10/2026): mọi trường khảo sát lọc được
 * thành nhóm tiêu chí. Trong một nhóm: HOẶC; giữa các nhóm: VÀ. Thuần — dùng ở cả máy
 * chủ lẫn trình duyệt.
 *
 * Ba kiểu nhóm:
 *  - `list`     câu hỏi nhiều lựa chọn: tách theo dấu phẩy, mỗi ý một tiêu chí
 *  - `single`   câu hỏi một lựa chọn: cả câu trả lời là một tiêu chí
 *  - `presence` trả lời tự do kiểu có/không: gom về Có / Không / Chưa rõ
 *  - `score`    điểm chấm từng hạng mục (0–5)
 * Trường mỗi cửa hàng một khác (tên, SĐT, link, ghi chú) không thành tiêu chí.
 */
import type { PartnerStoreMarketplaceEntity } from "./partner-marketplace.types"
import { normalizeTier } from "./partner-marketplace-row-mapper"

type Kind = "list" | "single" | "presence" | "score"
export interface FacetDef {
  key: string
  label: string
  kind: Kind | "tier" | "district"
}

const f = (key: string, label: string, kind: FacetDef["kind"]): FacetDef => ({ key, label, kind })

/** Thứ tự = thứ tự hiển thị trong dropdown. `key` là đường dẫn trường trong hồ sơ. */
export const FACET_DEFS: readonly FacetDef[] = [
  f("scoreAndTier.suggestedTier", "Hạng đối tác", "tier"),
  f("contact.address", "Quận / khu vực", "district"),
  f("business.challenges", "Khó khăn hiện tại", "list"),
  f("business.goals12m", "Mục tiêu 12 tháng", "list"),
  f("business.algExpectations", "Kỳ vọng khi hợp tác", "list"),
  f("business.cooperationWishes", "Muốn hợp tác", "single"),
  f("business.monthlyRevenue", "Doanh thu trung bình tháng", "single"),
  f("business.targetCustomers", "Khách hàng mục tiêu", "list"),
  f("business.customerSources", "Nguồn khách", "list"),
  f("business.paymentMethods", "Phương thức thanh toán", "list"),
  f("production.productLines", "Danh mục sản phẩm", "list"),
  f("production.flowerSupply", "Nguồn cung hoa", "list"),
  f("production.floristCount", "Số lượng nhân sự chế tác", "single"),
  f("production.lossRateEstimate", "Tỷ lệ hao hụt", "single"),
  f("production.rareFlowerAbility", "Đáp ứng hoa hiếm", "presence"),
  f("identity.operatingYears", "Số năm hoạt động", "single"),
  f("identity.scale", "Quy mô", "single"),
  f("identity.legalCompliance", "Giấy tờ pháp lý", "list"),
  f("identity.taxCode", "Mã số thuế", "presence"),
  f("facilityAndDelivery.coolers", "Tủ mát", "presence"),
  f("facilityAndDelivery.coldStorage", "Kho lạnh", "presence"),
  f("facilityAndDelivery.premises", "Mặt bằng", "list"),
  f("facilityAndDelivery.space", "Không gian cửa hàng", "list"),
  f("facilityAndDelivery.equipment", "Trang thiết bị", "list"),
  f("facilityAndDelivery.staffing", "Nhân sự", "list"),
  f("facilityAndDelivery.deliveryVehicles", "Phương tiện giao hàng", "list"),
  f("facilityAndDelivery.coldDeliveryAbility", "Giao hàng giữ lạnh", "presence"),
  f("digital.onlineOrderChannels", "Kênh nhận đơn online", "list"),
  f("digital.adsAndLivestream", "Chạy quảng cáo / livestream", "presence"),
  f("digital.website", "Website", "presence"),
  f("digital.tiktok", "TikTok", "presence"),
  f("digital.googleReview", "Đánh giá Google", "presence"),
  f("contact.email", "Email", "presence"),
  f("media.requiredPhotoTypes", "Ảnh đã chụp khi khảo sát", "list"),
  f("scoreAndTier.skillAndCraftScore", "Điểm tay nghề", "score"),
  f("scoreAndTier.processFacilityScore", "Điểm quy trình & cơ sở", "score"),
  f("scoreAndTier.supplyStorageScore", "Điểm nguồn cung & bảo quản", "score"),
  f("scoreAndTier.productionDeliveryScore", "Điểm sản xuất & giao hàng", "score"),
  f("scoreAndTier.legalDigitalScore", "Điểm pháp lý & số hoá", "score"),
  f("scoreAndTier.disciplineCooperationScore", "Điểm kỷ luật & hợp tác", "score"),
  f("audit.specialist", "Chuyên viên khảo sát", "single"),
]

/**
 * Quận Hà Nội: tên quận, viết tắt, và tên đường/phường hay gặp trong địa chỉ khảo sát
 * (phần lớn địa chỉ chỉ ghi số nhà + đường). Ước lượng theo tên đường — đường chạy qua
 * hai quận thì cửa hàng thuộc cả hai nhóm.
 */
const DISTRICTS: readonly [string, readonly string[]][] = [
  ["Ba Đình", ["ba đình", "bđ", "hoàng hoa thám", "giảng võ", "núi trúc", "giang văn minh", "đốc ngữ", "ngọc hà", "đội cấn", "kim mã", "liễu giai", "đào tấn", "văn cao", "quán thánh"]],
  ["Hoàn Kiếm", ["hoàn kiếm", "hk", "hàng bài", "hàng gai", "hàng đào", "tràng tiền", "hàng bông", "lý thường kiệt"]],
  ["Hai Bà Trưng", ["hai bà trưng", "hbt", "bạch mai", "minh khai", "lò đúc", "phố huế", "bà triệu", "thanh nhàn", "kim ngưu"]],
  ["Đống Đa", ["đống đa", "đđ", "ô chợ dừa", "trung liệt", "tây sơn", "thái hà", "xã đàn", "khâm thiên", "láng hạ", "chùa bộc", "nguyễn lương bằng", "hoàng cầu", "giảng võ"]],
  ["Tây Hồ", ["tây hồ", "lạc long quân", "xuân la", "âu cơ", "thụy khuê", "xuân diệu", "quảng an"]],
  ["Cầu Giấy", ["cầu giấy", "cg", "nguyễn phong sắc", "nghĩa tân", "trần đăng ninh", "trần quốc hoàn", "trung kính", "nguyễn khánh toàn", "xuân thủy", "hoàng quốc việt", "dịch vọng", "mai dịch", "quan hoa", "yên hòa", "trần duy hưng", "nguyễn thị định", "vũ phạm hàm", "trung hòa", "nguyễn ngọc vũ", "nguyễn văn huyên"]],
  ["Thanh Xuân", ["thanh xuân", "tx", "nguyễn trãi", "vũ tông phan", "khương đình", "nguyễn tuân", "ngụy như kon tum", "lê văn lương", "lê trọng tấn", "khương trung", "hạ đình"]],
  ["Hoàng Mai", ["hoàng mai", "định công", "tam trinh", "lĩnh nam", "giáp bát", "kim giang"]],
  ["Long Biên", ["long biên", "nguyễn văn cừ", "ngọc lâm", "bồ đề"]],
  ["Nam Từ Liêm", ["nam từ liêm", "mễ trì", "mỹ đình", "lê quang đạo", "phạm hùng", "hàm nghi"]],
  ["Bắc Từ Liêm", ["bắc từ liêm", "cổ nhuế", "phạm văn đồng", "xuân đỉnh"]],
  ["Hà Đông", ["hà đông", "hđ", "ngô thì nhậm", "tô hiệu", "quang trung", "văn quán", "mộ lao", "vạn phúc", "vũ trọng khánh"]],
  ["Gia Lâm", ["gia lâm", "trâu quỳ"]],
  ["Đông Anh", ["đông anh"]],
  ["Thanh Trì", ["thanh trì"]],
  ["Hoài Đức", ["hoài đức"]],
  ["Sóc Sơn", ["sóc sơn"]],
]

/** Khớp nguyên cụm từ — mốc `\b` của regex không hiểu chữ có dấu (đ, ư…). */
function hasPhrase(text: string, phrase: string): boolean {
  let from = 0
  for (;;) {
    const at = text.indexOf(phrase, from)
    if (at === -1) return false
    const before = text[at - 1] ?? " "
    const after = text[at + phrase.length] ?? " "
    if (!/\p{L}|\p{N}/u.test(before) && !/\p{L}|\p{N}/u.test(after)) return true
    from = at + 1
  }
}

/** Viết hoa từ viết tắt hay gặp trong câu trả lời khảo sát. */
const ACRONYMS = /\b(pccc|ncc|qr|vat|gpkd|kol|b2b)\b/g

const UNKNOWN = /^(chưa xác định|chưa rõ|không rõ|không cung cấp|chưa cung cấp|không chia sẻ|n\/a|-+)$/
const NO = /^(không|không có|ko|k|0|chưa|chưa có|không làm|chưa làm|không dùng|chưa dùng)\b/

const clean = (v: string) => v.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase()
const display = (v: string) => {
  const up = v.replace(ACRONYMS, (m) => m.toUpperCase())
  return up ? up.charAt(0).toUpperCase() + up.slice(1) : up
}

function rawAt(store: PartnerStoreMarketplaceEntity, path: string): unknown {
  let cur: unknown = store
  for (const part of path.split(".")) cur = cur && typeof cur === "object" ? (cur as Record<string, unknown>)[part] : undefined
  return cur
}

function presenceOf(v: string): string {
  const c = clean(v)
  if (!c || UNKNOWN.test(c)) return "Chưa rõ"
  return NO.test(c) ? "Không" : "Có"
}

/** Giá trị tiêu chí (đã chuẩn hoá để hiển thị) của một cửa hàng trong một nhóm. */
export function facetValues(store: PartnerStoreMarketplaceEntity, def: FacetDef): string[] {
  const raw = rawAt(store, def.key)
  const text = Array.isArray(raw) ? raw.join(", ") : String(raw ?? "")
  switch (def.kind) {
    case "tier":
      return [normalizeTier(text)]
    case "district": {
      const addr = clean(text)
      const hit = DISTRICTS.filter(([, names]) => names.some((n) => hasPhrase(addr, n))).map(([name]) => name)
      return hit.length ? hit : ["Khác / chưa rõ"]
    }
    case "presence":
      return [presenceOf(text)]
    case "score": {
      const n = clean(text)
      return /^\d+([.,]\d+)?$/.test(n) ? [`${n.replace(",", ".")} điểm`] : ["Chưa rõ"]
    }
    case "single": {
      const c = clean(text)
      return c && !UNKNOWN.test(c) ? [display(c)] : ["Chưa rõ"]
    }
    case "list": {
      const parts = text.split(/[,;]/).map(clean).filter((p) => p && !UNKNOWN.test(p))
      return parts.length ? [...new Set(parts)].map(display) : ["Chưa rõ"]
    }
  }
}

/** Tiêu chí đang chọn: khoá nhóm → các giá trị đã chọn. */
export type FacetSelection = Readonly<Record<string, readonly string[]>>

export function matchesFacets(store: PartnerStoreMarketplaceEntity, selection: FacetSelection, skipKey?: string): boolean {
  for (const def of FACET_DEFS) {
    const wanted = selection[def.key]
    if (def.key === skipKey || !wanted || wanted.length === 0) continue
    const values = facetValues(store, def)
    if (!wanted.some((w) => values.includes(w))) return false
  }
  return true
}

export interface FacetGroup {
  key: string
  label: string
  options: { value: string; count: number }[]
}

/** Trần số lựa chọn mỗi nhóm — giữ dropdown đọc được; còn lại tìm bằng ô tìm nhanh. */
export const MAX_OPTIONS_PER_GROUP = 40

/**
 * Nhóm tiêu chí kèm số cửa hàng. Danh sách lựa chọn CỐ ĐỊNH theo toàn bộ dữ liệu (dropdown
 * không nhảy khi chọn); số đếm của một nhóm tính trên các cửa hàng thoả mọi nhóm KHÁC đang
 * chọn — lựa chọn ra 0 cửa hàng vẫn hiện (làm mờ ở giao diện). Nhóm chỉ có một giá trị
 * trên toàn bộ dữ liệu thì không lọc được → bỏ.
 */
export function buildFacetGroups(stores: readonly PartnerStoreMarketplaceEntity[], selection: FacetSelection = {}): FacetGroup[] {
  return FACET_DEFS.map((def) => {
    const counts = new Map<string, number>()
    for (const store of stores) {
      const hit = matchesFacets(store, selection, def.key)
      for (const v of facetValues(store, def)) counts.set(v, (counts.get(v) ?? 0) + (hit ? 1 : 0))
    }
    for (const v of selection[def.key] ?? []) if (!counts.has(v)) counts.set(v, 0)
    const chosen = new Set(selection[def.key] ?? [])
    const options = [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort(
        (a, b) =>
          Number(chosen.has(b.value)) - Number(chosen.has(a.value)) ||
          Number(a.value === "Chưa rõ") - Number(b.value === "Chưa rõ") ||
          b.count - a.count ||
          a.value.localeCompare(b.value, "vi")
      )
      .slice(0, MAX_OPTIONS_PER_GROUP)
    return { key: def.key, label: def.label, options }
  }).filter((g) => g.options.length > 1 || (selection[g.key]?.length ?? 0) > 0)
}
