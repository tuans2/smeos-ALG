/**
 * Các trường thông tin sản phẩm có thể hiển thị trên mẫu Thẻ chào, và cấu hình
 * bật/tắt theo từng mẫu của mỗi cửa hàng (lưu ở `organizations.settings`).
 * Hàm thuần — không Prisma.
 */

/**
 * Luôn hiển thị, không tắt được (chốt với PO 05/10/2026). Giá tắt được cho cả cửa hàng
 * bằng công tắc riêng (`price-visibility.ts`, ALG 5.5), không theo từng mẫu.
 */
export const REQUIRED_DISPLAY_FIELDS = ["code", "name"] as const

/** Các trường cửa hàng được bật/tắt — thứ tự ở đây là thứ tự hiển thị. */
export const OPTIONAL_DISPLAY_FIELDS = [
  { key: "flowers", label: "Thành phần hoa" },
  { key: "color", label: "Màu chủ đạo" },
  { key: "style", label: "Phong cách" },
  { key: "dimensions", label: "Kích thước" },
  { key: "wrapStyle", label: "Kiểu gói" },
  { key: "category", label: "Loại sản phẩm" },
  { key: "description", label: "Mô tả / ý nghĩa" },
] as const

export type OptionalDisplayField = (typeof OPTIONAL_DISPLAY_FIELDS)[number]["key"]

/** Nhãn và danh sách trường hiển thị tương ứng theo đặc thù từng ngành */
export function getOptionalDisplayFields(industryKey?: string): { key: OptionalDisplayField; label: string }[] {
  switch (industryKey) {
    case "HOMESTAY":
      return [
        { key: "category", label: "Hạng phòng / Loại lưu trú" },
        { key: "flowers", label: "Tiện nghi & Vật tư phòng" },
        { key: "style", label: "Phong cách bài trí" },
        { key: "dimensions", label: "Diện tích / Quy mô" },
        { key: "description", label: "Mô tả trải nghiệm & View phòng" },
      ]
    case "FASHION":
      return [
        { key: "category", label: "Dòng sản phẩm thiết kế" },
        { key: "flowers", label: "Chất liệu & Phụ liệu" },
        { key: "color", label: "Tone màu trang phục" },
        { key: "style", label: "Phong cách thời trang" },
        { key: "dimensions", label: "Thông số size / Chiều dài" },
        { key: "description", label: "Câu chuyện thiết kế & Gợi ý phối đồ" },
      ]
    case "FNB":
      return [
        { key: "category", label: "Phân loại món" },
        { key: "flowers", label: "Nguyên liệu chính & Định lượng" },
        { key: "style", label: "Hương vị & Trải nghiệm" },
        { key: "description", label: "Mô tả món & Gợi ý thưởng thức" },
      ]
    case "CRAFT_GIFT":
      return [
        { key: "category", label: "Nhóm quà tặng" },
        { key: "flowers", label: "Vật liệu thủ công" },
        { key: "color", label: "Tone màu chủ đạo" },
        { key: "style", label: "Phong cách thiết kế" },
        { key: "dimensions", label: "Kích thước sản phẩm" },
        { key: "description", label: "Ý nghĩa quà tặng & HD bảo quản" },
      ]
    case "SERVICES":
      return [
        { key: "category", label: "Gói dịch vụ" },
        { key: "flowers", label: "Quy trình & Vật tư thực hiện" },
        { key: "style", label: "Hình thức phục vụ" },
        { key: "dimensions", label: "Thời lượng liệu trình" },
        { key: "description", label: "Mô tả dịch vụ & Cam kết hiệu quả" },
      ]
    case "RETAIL_GENERAL":
      return [
        { key: "category", label: "Ngành hàng" },
        { key: "flowers", label: "Thành phần / Đóng gói" },
        { key: "color", label: "Màu sắc / Phiên bản" },
        { key: "dimensions", label: "Quy cách đóng gói" },
        { key: "description", label: "Mô tả công dụng & Hướng dẫn sử dụng" },
      ]
    case "FLORAL":
    default:
      return [...OPTIONAL_DISPLAY_FIELDS]
  }
}

const OPTIONAL_KEYS = new Set<string>(OPTIONAL_DISPLAY_FIELDS.map((f) => f.key))

/** Mặc định khi cửa hàng chưa chỉnh: bật tất cả (trường không có dữ liệu vẫn tự ẩn). */
export const DEFAULT_ENABLED_FIELDS: OptionalDisplayField[] = OPTIONAL_DISPLAY_FIELDS.map((f) => f.key)

/** Khoá trong `organizations.settings`: `{ [templateId]: OptionalDisplayField[] }` */
export const DISPLAY_SETTINGS_KEY = "greetingCardDisplay"

export type DisplaySettings = Record<string, OptionalDisplayField[]>

/** Lọc bỏ khoá lạ/trùng, giữ đúng thứ tự chuẩn. */
export function sanitizeEnabledFields(input: unknown): OptionalDisplayField[] {
  if (!Array.isArray(input)) return [...DEFAULT_ENABLED_FIELDS]
  const wanted = new Set(input.filter((v): v is string => typeof v === "string" && OPTIONAL_KEYS.has(v)))
  return OPTIONAL_DISPLAY_FIELDS.map((f) => f.key).filter((k) => wanted.has(k))
}

/** Đọc toàn bộ cấu hình từ `organizations.settings` (bỏ qua dữ liệu hỏng). */
export function readDisplaySettings(orgSettings: unknown): DisplaySettings {
  const raw = orgSettings && typeof orgSettings === "object" ? (orgSettings as Record<string, unknown>)[DISPLAY_SETTINGS_KEY] : null
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const out: DisplaySettings = {}
  for (const [templateId, fields] of Object.entries(raw as Record<string, unknown>)) {
    out[templateId] = sanitizeEnabledFields(fields)
  }
  return out
}

/** Các trường đang bật cho một mẫu (mặc định nếu chưa chỉnh). */
export function enabledFieldsFor(settings: DisplaySettings, templateId: string): OptionalDisplayField[] {
  return settings[templateId] ?? [...DEFAULT_ENABLED_FIELDS]
}
