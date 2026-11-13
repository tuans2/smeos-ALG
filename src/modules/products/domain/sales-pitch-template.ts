/**
 * sales-pitch-template.ts
 *
 * Domain logic tạo Thẻ Chào Sản Phẩm (M01c) và Kịch bản tư vấn Zalo/Messenger cho Sales.
 * Tổng hợp dữ liệu từ:
 *  - M01a (BOM, cấu phần hoa, số lượng, vật chứa, hình dáng)
 *  - M01b (Tên gợi ý, mô tả cảm xúc, phong cách, dịp phù hợp, phân khúc giá)
 *  - Overrides từ nhân viên kinh doanh: Cho phép chỉnh sửa 100% tất cả các trường
 *    trước khi chốt duyệt xuất bản final (status: DRAFT | FINALIZED).
 */

import { formatCurrency } from "@/lib/i18n/formatters"

/**
 * Một dòng BOM thô trong kết quả phân tích (JSON do mô hình trả — chưa kiểm
 * dạng; mọi trường đều có thể vắng). Chỉ liệt kê các trường mẫu này đọc.
 */
interface RawBomItem {
  id?: string
  name?: string
  nhom_hoa?: string
  quantity?: number | null
  count?: number | null
  dvt_dem?: string
  mo_ta_mau?: string
  mau?: string
  color?: string
  role?: string
  printed_text?: string
  material?: string
}

export interface SalesPitchItem {
  id?: string | undefined
  name: string
  quantity: number | string | null
  unit: string
  color?: string | null | undefined
  role?: string | null | undefined
}

/**
 * Tông giọng theo dịp (nợ #104, 18/09). Giữ tách biệt với
 * `OccasionRegisterValue` của `organization/domain/occasion-rules.ts` (cùng
 * ba giá trị nhưng khai riêng) — `products/domain` không phụ thuộc
 * `organization/domain`, giữ đúng ranh giới module hiện có của hệ thống.
 */
export type OccasionRegister = "FESTIVE" | "NEUTRAL" | "SOLEMN"

export interface SalesPitchData {
  id?: string | undefined
  analysisId?: string | null | undefined
  productId?: string | null | undefined
  productName: string
  sku?: string | null | undefined
  imageUrl?: string | null | undefined
  style: string
  occasions: string[]
  /**
   * Tông giọng suy ra từ dịp ĐẦU TIÊN (`occasions[0]`) khớp CHÍNH XÁC (không
   * phân biệt hoa/thường, không suy đoán từ khoá) với danh mục dịp tenant đã
   * cấu hình (nợ #104). Không khớp hoặc tenant chưa cấu hình dịp nào ->
   * `"NEUTRAL"` — giữ nguyên kịch bản mặc định hiện có, không đổi hành vi cho
   * tổ chức chưa dùng tính năng này.
   */
  occasionRegister: OccasionRegister
  description: string
  mainFlowers: SalesPitchItem[]
  foliageItems: SalesPitchItem[]
  accessoryItems: SalesPitchItem[]
  wrapping: string
  container: string
  /**
   * Kích thước ước tính. KHÔNG có mặc định bịa (nợ #96, phát hiện phụ
   * 17/09/2026, trả 18/09) — trước đây mọi sản phẩm chưa nhập kích thước
   * thật đều hiện cứng "Cao ~55cm × Rộng ~40cm" như thể là số đo thật.
   * Thiếu một trong hai chiều -> `null`, `generateZaloPitchScript` phải hiện
   * rõ "chưa có kích thước cụ thể" thay vì một con số trông như thật — đúng
   * nguyên tắc đã áp dụng cho `priceVnd` (mục 8 của `buildSalesPitchData`).
   */
  dimensions: {
    heightCm: number | null
    widthCm: number | null
  }
  priceVnd: number | null
  originalPriceVnd: number | null
  priceSegment: string
  freeGifts: string[]
  guarantees: string[]
  shopName?: string | null | undefined
  shopHotline?: string | null | undefined
  customNote?: string | null | undefined
  /**
   * Câu kêu gọi hành động riêng của thương hiệu (`brand_profiles.cta_templates`,
   * nợ #102 — tách khỏi free_gifts/guarantees 17/09). Khi có, thay câu đóng
   * kịch bản Zalo cố định; khi không có (`null`), giữ nguyên câu mặc định hệ
   * thống — KHÔNG tự bịa một câu khác.
   */
  ctaPhrase?: string | null | undefined
  /**
   * Câu chào mở đầu kịch bản Zalo do tenant tự ghi đè (nợ #99, Giai đoạn 3 —
   * field đầu tiên của cơ chế `template_overrides`, họ ST, 18/09). `null`
   * khi tenant chưa cấu hình -> giữ nguyên kịch bản mặc định hệ thống hiện
   * có (không thêm dòng chào nào), không bịa câu chào thay tenant.
   */
  greetingLine?: string | null | undefined
  status: "DRAFT" | "FINALIZED"
  finalizedAt?: string | null | undefined
  updatedAt?: string | null | undefined
}

export interface SalesPitchOverrides {
  id?: string | undefined
  analysisId?: string | null | undefined
  productId?: string | null | undefined
  productName?: string | undefined
  sku?: string | null | undefined
  imageUrl?: string | null | undefined
  style?: string | undefined
  occasions?: string[] | undefined
  description?: string | undefined
  mainFlowers?: SalesPitchItem[] | undefined
  foliageItems?: SalesPitchItem[] | undefined
  accessoryItems?: SalesPitchItem[] | undefined
  wrapping?: string | undefined
  container?: string | undefined
  heightCm?: number | undefined
  widthCm?: number | undefined
  priceVnd?: number | null | undefined
  originalPriceVnd?: number | null | undefined
  priceSegment?: string | undefined
  freeGifts?: string[] | undefined
  guarantees?: string[] | undefined
  shopName?: string | null | undefined
  shopHotline?: string | null | undefined
  customNote?: string | null | undefined
  status?: ("DRAFT" | "FINALIZED") | undefined
  finalizedAt?: string | null | undefined
}

/**
 * Không có quà tặng/cam kết "mặc định hệ thống": thẻ chào gửi thẳng cho khách, nên chỉ in những gì
 * cửa hàng tự khai (hồ sơ hoặc chỉnh tay). Trước đây in sẵn "nước dưỡng Chrysal", "giao 60–90 phút",
 * "bảo hành đổi mới"… mà tiệm chưa hề cam kết (audit sâu MEUX 29/10/2026).
 */
export const DEFAULT_FREE_GIFTS: string[] = []

export const DEFAULT_GUARANTEES: string[] = []

export interface TenantSalesDefaults {
  shopName?: string | null | undefined
  shopHotline?: string | null | undefined
  freeGifts?: string[] | null | undefined
  guarantees?: string[] | null | undefined
  /** Danh sách câu kêu gọi hành động của thương hiệu — nợ #102. Chọn câu đầu tiên. */
  ctaPhrases?: string[] | null | undefined
  /**
   * Danh mục dịp tenant đã cấu hình (nợ #104, `occasions` table) — chỉ cần
   * tên + tông giọng để khớp với `occasions[0]` của lượt chào hàng này. Nơi
   * gọi (`tai-anh/page.tsx`) tự nạp qua `GET /api/v1/occasions`.
   */
  occasionRegistry?: ReadonlyArray<{ name: string; register: OccasionRegister }> | null | undefined
  /**
   * Câu chào mở đầu kịch bản Zalo, nạp từ `template_overrides`
   * (`ST`/`sales_pitch_zalo`/`greeting_line`, nợ #99, 18/09). Nơi gọi
   * (`tai-anh/page.tsx`) tự nạp qua `GET /api/v1/template-overrides`.
   */
  greetingLine?: string | null | undefined
}

/**
 * Xây dựng dữ liệu Thẻ Chào Sản Phẩm từ M01a + M01b + Overrides + Tenant Profile Defaults
 * Cho phép ghi đè 100% bất kỳ trường nào theo mong muốn của Sales.
 */
export function buildSalesPitchData(
  analysisRaw: Record<string, unknown> | null | undefined,
  // copyRaw/overrides/imageUrl không còn đánh dấu "?" (optional) — lý do
  // thuần TypeScript: một tham số bắt buộc (tenantDefaults) không được phép
  // đứng sau tham số optional trong khai báo vị trí. Giữ union "| undefined"
  // để nơi gọi vẫn có thể truyền `undefined` khi không có, nhưng KHÔNG được
  // bỏ hẳn tham số — bắt buộc mọi lời gọi phải cân nhắc rõ ràng cả 5 tham số.
  copyRaw: Record<string, unknown> | null | undefined,
  overrides: SalesPitchOverrides | undefined,
  imageUrl: string | null | undefined,
  /**
   * Hồ sơ mặc định của tenant (business_profiles/brand_profiles) — BẮT BUỘC
   * truyền (có thể là `null` khi tổ chức chưa nhập hồ sơ). Cố tình KHÔNG để
   * optional để TypeScript chặn ngay lúc biên dịch nếu có nơi gọi quên nối
   * dữ liệu tenant thật — đây chính là nguyên nhân gây lỗi tên tiệm/hotline
   * giả hiển thị cho khách hàng thật, phát hiện ở đợt rà soát 17/09/2026.
   */
  tenantDefaults: TenantSalesDefaults | null
): SalesPitchData {
  const a = analysisRaw ?? {}
  const bom = (a.bom as Record<string, unknown> | undefined) ?? {}
  const identity = (a.identity as Record<string, unknown> | undefined) ?? {}
  const c = copyRaw ?? {}

  // 1. Tên sản phẩm & SKU
  const defaultName =
    (c.suggested_name as string) ||
    (a.product_name as string) ||
    (identity.category as string) ||
    "Sản phẩm thiết kế cao cấp"
  const productName = overrides?.productName ?? defaultName
  const sku = overrides?.sku ?? (a.sku as string) ?? (a.code as string) ?? null

  // 2. Phong cách & Dịp
  const defaultStyle =
    (c.suggested_style as string) ||
    (identity.phong_cach as string) ||
    "Hiện đại & Tinh tế"
  const style = overrides?.style ?? defaultStyle

  const rawOccasions =
    (c.suggested_occasions as string[]) ||
    (identity.dip_su_dung ? [String(identity.dip_su_dung)] : [])
  const defaultOccasions = rawOccasions.length > 0 ? rawOccasions : ["Sinh nhật", "Chúc mừng", "Kỷ niệm"]
  const occasions = overrides?.occasions ?? defaultOccasions

  // 3. Mô tả
  const defaultDescription =
    (c.suggested_description as string) ||
    (a.description as string) ||
    "Thiết kế sản phẩm được tuyển chọn kỹ lưỡng từ những bông sản phẩm thắm nhất, mang thông điệp trao gửi yêu thương và trân trọng."
  const description = overrides?.description ?? defaultDescription

  // 4. Hoa chính
  const rawFlowers = Array.isArray(bom.flowers) ? bom.flowers : []
  const defaultMainFlowers: SalesPitchItem[] = rawFlowers.map((f: RawBomItem, idx: number) => ({
    id: f.id || `flower-${idx}`,
    name: f.name || f.nhom_hoa || "Sản phẩm",
    quantity: f.quantity ?? f.count ?? null,
    unit: f.dvt_dem || "cành",
    color: f.mo_ta_mau || f.mau || f.color || null,
    role: f.role || null,
  }))
  const mainFlowers = overrides?.mainFlowers ?? defaultMainFlowers

  // 5. Lá & Phụ kiện
  const rawFoliage = Array.isArray(bom.foliage) ? bom.foliage : []
  const defaultFoliage: SalesPitchItem[] = rawFoliage.map((f: RawBomItem, idx: number) => ({
    id: f.id || `foliage-${idx}`,
    name: f.name || "Lá phụ",
    quantity: f.quantity ?? f.count ?? null,
    unit: f.dvt_dem || "cành",
    color: f.color || f.mau || null,
    role: f.role || null,
  }))
  const foliageItems = overrides?.foliageItems ?? defaultFoliage

  const rawAcc = Array.isArray(bom.accessories) ? bom.accessories : []
  const defaultAcc: SalesPitchItem[] = rawAcc.map((acc: RawBomItem, idx: number) => {
    const rawName = acc.name || "Phụ kiện"
    const isCard = rawName.toLowerCase().includes("thiệp") || rawName.toLowerCase().includes("biển") || Boolean(acc.printed_text)
    const displayName = isCard && acc.printed_text ? `${rawName} (In: "${acc.printed_text}")` : rawName
    return {
      id: acc.id || `acc-${idx}`,
      name: displayName,
      quantity: acc.quantity ?? 1,
      unit: "cái",
      color: acc.color || null,
    }
  })
  const accessoryItems = overrides?.accessoryItems ?? defaultAcc

  // 6. Vật chứa & Giấy gói
  const defaultContainer = (identity.container as string) || ""
  const container = overrides?.container ?? defaultContainer

  const rawWrapping = Array.isArray(bom.wrapping) ? bom.wrapping : []
  const defaultWrapping = rawWrapping.length > 0
    ? rawWrapping.map((w: RawBomItem) => w.material || w.name || "Giấy gói").filter(Boolean).join(", ")
    : ""
  const wrapping = overrides?.wrapping ?? defaultWrapping

  // 7. Kích thước — KHÔNG bịa mặc định 55×40cm nữa (nợ #96, đã trả 18/09).
  // Chưa có override thật từ Sales -> để `null`, script hiện rõ "chưa có
  // kích thước cụ thể" — không hiện một con số cố định trông như đo thật.
  const heightCm = overrides?.heightCm ?? null
  const widthCm = overrides?.widthCm ?? null

  // 8. Giá chào & Phân khúc
  // KHÔNG tự bịa giá theo phân khúc: hiện chưa có nguồn giá bán chính thức
  // nào (giá sản phẩm / pricing_rules) được nối tới bước này. Nếu chưa có
  // override thật, để trống — UI phải hiện rõ "Chưa có giá, liên hệ shop"
  // thay vì một con số trông như giá thật (quyết định Tony, rà soát 17/09/2026).
  const priceSegment = overrides?.priceSegment ?? (c.suggested_price_segment as string) ?? "standard"
  const priceVnd = overrides?.priceVnd !== undefined ? overrides.priceVnd : null
  const originalPriceVnd = overrides?.originalPriceVnd !== undefined ? overrides.originalPriceVnd : null

  // 9. Quà tặng & Cam kết (Ưu tiên: Overrides -> Tenant Defaults -> System Defaults)
  const defaultFreeGifts = tenantDefaults?.freeGifts && tenantDefaults.freeGifts.length > 0
    ? tenantDefaults.freeGifts
    : DEFAULT_FREE_GIFTS
  const freeGifts = overrides?.freeGifts ?? defaultFreeGifts

  const defaultGuarantees = tenantDefaults?.guarantees && tenantDefaults.guarantees.length > 0
    ? tenantDefaults.guarantees
    : DEFAULT_GUARANTEES
  const guarantees = overrides?.guarantees ?? defaultGuarantees

  // 10. Thông tin cửa hàng & Trạng thái xuất bản (Ưu tiên: Overrides -> Tenant Profile -> Fallback)
  // Fallback KHÔNG được là một tên thương hiệu/hotline trông như thật (trước đây
  // là "ALG Flower Boutique" / "1900 xxxx") — nếu tenant chưa nhập hồ sơ, phải
  // hiện rõ đây là chỗ trống cần cập nhật, tránh gửi nhầm thông tin giả cho khách.
  const shopName = overrides?.shopName ?? tenantDefaults?.shopName ?? "Chưa cập nhật tên tiệm"
  const shopHotline = overrides?.shopHotline ?? tenantDefaults?.shopHotline ?? "Chưa cập nhật hotline"
  const customNote = overrides?.customNote ?? null

  // 11. Câu kêu gọi hành động riêng của thương hiệu (nợ #102) — chọn câu đầu
  // tiên trong danh sách tenant đã cấu hình. Không có cấu hình -> null, để
  // generateZaloPitchScript tự rơi về câu mặc định hệ thống, không bịa.
  const ctaPhrase = tenantDefaults?.ctaPhrases && tenantDefaults.ctaPhrases.length > 0
    ? (tenantDefaults.ctaPhrases[0] ?? null)
    : null
  const status = overrides?.status ?? "DRAFT"
  const finalizedAt = overrides?.finalizedAt ?? null

  // 12. Giọng theo dịp (nợ #104) — khớp CHÍNH XÁC (không phân biệt hoa/thường,
  // cắt khoảng trắng đầu/cuối) tên dịp ĐẦU TIÊN với danh mục dịp tenant đã
  // cấu hình. KHÔNG suy đoán "trang trọng" từ từ khoá trong tên dịp — đúng
  // nguyên tắc "không bịa" đã áp dụng cho tone_of_voice/cta_templates
  // (nợ #102/#103). Không khớp -> "NEUTRAL", giữ nguyên kịch bản mặc định.
  const primaryOccasion = occasions[0] ?? null
  const matchedOccasionEntry = primaryOccasion
    ? tenantDefaults?.occasionRegistry?.find(
        (o) => o.name.trim().toLowerCase() === primaryOccasion.trim().toLowerCase()
      )
    : undefined
  const occasionRegister: OccasionRegister = matchedOccasionEntry?.register ?? "NEUTRAL"

  // 13. Câu chào mở đầu ghi đè theo tenant (nợ #99, Giai đoạn 3, field
  // `greeting_line` họ ST) — không có cấu hình -> null, giữ nguyên kịch bản
  // mặc định hệ thống, không bịa câu chào thay tenant.
  const greetingLine = tenantDefaults?.greetingLine ?? null

  return {
    id: overrides?.id,
    analysisId: overrides?.analysisId ?? (a.id as string) ?? null,
    productId: overrides?.productId ?? (a.product_id as string) ?? null,
    productName,
    sku,
    imageUrl: overrides?.imageUrl ?? imageUrl ?? null,
    style,
    occasions,
    occasionRegister,
    description,
    mainFlowers,
    foliageItems,
    accessoryItems,
    wrapping,
    container,
    dimensions: { heightCm, widthCm },
    priceVnd,
    originalPriceVnd,
    priceSegment,
    freeGifts,
    guarantees,
    shopName,
    shopHotline,
    customNote,
    ctaPhrase,
    greetingLine,
    status,
    finalizedAt,
  }
}

/**
 * Định dạng số tiền VND: 850000 -> "850.000 ₫"
 */
export function formatCurrencyVnd(amount: number | null | undefined): string {
  if (amount == null) return "Chưa có giá, liên hệ shop"
  return formatCurrency(amount)
}

/**
 * Định dạng kích thước ước tính (nợ #96, 18/09). Thiếu một trong hai chiều
 * (`null`) -> hiện rõ "chưa có kích thước cụ thể", không bịa số — cùng
 * nguyên tắc đã áp dụng cho `formatCurrencyVnd`.
 */
export function formatDimensions(
  heightCm: number | null | undefined,
  widthCm: number | null | undefined
): string {
  if (heightCm == null || widthCm == null) return "chưa có kích thước cụ thể, liên hệ shop để xác nhận"
  return `Cao ~${heightCm}cm × Rộng ~${widthCm}cm`
}

/**
 * Sinh kịch bản tư vấn Zalo / Messenger có định dạng emoji trực quan cho Sales
 */
export function generateZaloPitchScript(pitch: SalesPitchData): string {
  const priceStr = formatCurrencyVnd(pitch.priceVnd)
  const origPriceStr = pitch.originalPriceVnd && pitch.priceVnd && pitch.originalPriceVnd > pitch.priceVnd
    ? ` (Giá gốc: ${formatCurrencyVnd(pitch.originalPriceVnd)})`
    : ""

  const flowersStr = pitch.mainFlowers.length > 0
    ? pitch.mainFlowers.map((f) => `  • ${f.name}${f.quantity ? ` (${f.quantity} ${f.unit})` : ""}${f.color ? ` — Tone ${f.color}` : ""}`).join("\n")
    : "  • Sản phẩm tuyển chọn theo mẫu"

  const foliageStr = pitch.foliageItems.length > 0
    ? `\n🌿 Lá đệm: ${pitch.foliageItems.map((f) => `${f.name}${f.quantity ? ` (${f.quantity} ${f.unit})` : ""}`).join(", ")}`
    : ""

  const cardItem = pitch.accessoryItems.find(
    (a) => a.name.toLowerCase().includes("thiệp") || a.name.toLowerCase().includes("biển") || a.name.includes('"')
  )
  const otherAccs = pitch.accessoryItems.filter((a) => a !== cardItem)

  const cardStr = cardItem ? `\n💌 Thiệp / Biển chúc mừng: ${cardItem.name}` : ""
  const accStr = otherAccs.length > 0
    ? `\n🎀 Phụ kiện: ${otherAccs.map((a) => `${a.name}${a.quantity ? ` (${a.quantity} ${a.unit})` : ""}`).join(", ")}`
    : !cardItem && pitch.accessoryItems.length > 0
    ? `\n🎀 Phụ kiện: ${pitch.accessoryItems.map((a) => `${a.name}${a.quantity ? ` (${a.quantity} ${a.unit})` : ""}`).join(", ")}`
    : ""

  // Chỉ in mục quà tặng/cam kết khi tiệm đã khai — không để tiêu đề rỗng gửi khách.
  const giftsStr = pitch.freeGifts.map((g) => `  🎁 ${g}`).join("\n")
  const guaranteesStr = pitch.guarantees.map((g) => `  ✓ ${g}`).join("\n")
  const giftsBlock = giftsStr ? `\n🎁 QUÀ TẶNG KÈM THEO:\n${giftsStr}\n` : ""
  const guaranteesBlock = guaranteesStr ? `\n🛡️ CAM KẾT DỊCH VỤ TỪ SHOP:\n${guaranteesStr}` : ""
  const plainGuarantees = guaranteesStr ? `\nCAM KẾT DỊCH VỤ TỪ SHOP:\n${guaranteesStr}` : ""

  const noteStr = pitch.customNote ? `\n📌 LƯU Ý / ƯU ĐÃI RIÊNG:\n${pitch.customNote}\n` : ""
  const hotlineStr = pitch.shopHotline ? ` 📞 Hotline: ${pitch.shopHotline}` : ""

  // Câu chào mở đầu ghi đè theo tenant (nợ #99, field `greeting_line`) —
  // chỉ thêm dòng khi tenant đã cấu hình, không đổi phần còn lại của kịch
  // bản đã được anh Tony duyệt (nợ #104).
  const greetingStr = pitch.greetingLine ? `${pitch.greetingLine}\n\n` : ""

  // Câu đóng cho tông mặc định (FESTIVE/NEUTRAL): dùng câu kêu gọi hành động
  // riêng của thương hiệu (nợ #102) khi tenant đã cấu hình; giữ nguyên câu
  // mặc định hệ thống khi chưa có.
  const closingStr = pitch.ctaPhrase
    ? `${pitch.ctaPhrase}${hotlineStr} ❤️`
    : `Quý khách cần tư vấn thiệp chúc mừng riêng hoặc đặt giao hoa hỏa tốc, xin vui lòng nhắn tin trực tiếp cho shop ạ!${hotlineStr} ❤️`

  // Kịch bản tông SOLEMN (nợ #104, "Chia buồn" và các dịp tương tự) — bớt hẳn
  // emoji ăn mừng (🌸🎯🎀💰🎁✨❤️) và câu chữ theo dịp lễ; giữ nguyên đủ dữ
  // kiện sản phẩm/giá/cam kết vì Sales vẫn cần chốt đơn. Câu chữ do Claude
  // soạn, ĐÃ ĐƯỢC ANH TONY DUYỆT 18/09/2026 (AskUserQuestion, dùng nguyên
  // bản không sửa) — coi là bản chính thức, không còn là mặc định tạm.
  if (pitch.occasionRegister === "SOLEMN") {
    const solemnClosingStr = pitch.ctaPhrase
      ? `${pitch.ctaPhrase}${hotlineStr}`
      : `Quý khách cần hỗ trợ thêm hoặc đặt giao hoa nhanh, xin vui lòng nhắn tin trực tiếp cho shop ạ.${hotlineStr}`

    return `${greetingStr}[THÔNG TIN SẢN PHẨM] ${pitch.productName}
────────────────────
Kích thước ước tính: ${formatDimensions(pitch.dimensions.heightCm, pitch.dimensions.widthCm)}
Quy cách: ${pitch.container} (${pitch.wrapping})

Ý NGHĨA & MÔ TẢ:
"${pitch.description}"

THÀNH PHẦN HOA CHÍNH:
${flowersStr}${foliageStr}${cardStr}${accStr}

GIÁ: ${priceStr}${origPriceStr}
${plainGuarantees}
${noteStr}
────────────────────
${solemnClosingStr}`
  }

  return `${greetingStr}🌸 [THÔNG TIN SẢN PHẨM] ${pitch.productName.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━
✨ Phong cách: ${pitch.style}
🎯 Phù hợp dịp: ${pitch.occasions.join(", ")}
📐 Kích thước ước tính: ${formatDimensions(pitch.dimensions.heightCm, pitch.dimensions.widthCm)}
${pitch.container || pitch.wrapping ? `🎀 Quy cách: ${[pitch.container, pitch.wrapping].filter(Boolean).join(" — ")}\n` : ""}
💬 Ý NGHĨA & MÔ TẢ:
"${pitch.description}"

🌺 THÀNH PHẦN HOA CHÍNH:
${flowersStr}${foliageStr}${cardStr}${accStr}

💰 GIÁ: ${priceStr}${origPriceStr}
${giftsBlock}${guaranteesBlock}
${noteStr}
━━━━━━━━━━━━━━━━━━━━
${closingStr}`
}
