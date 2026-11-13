/**
 * ĐP-3 §6.2 mục 3.2 — Sổ đăng ký trường lõi BẰNG CODE. Đây là LỚP MÃ (Đặc
 * tả trường §16.2): khoá trường, kiểu dữ liệu, mức yêu cầu SÀN và độ nhạy
 * do người viết mã khai, không đổi lúc chạy. Quản trị nền tảng chỉ sửa lớp
 * CẤU HÌNH (nhãn, hiển thị theo tổ chức, nâng mức yêu cầu…) nằm ở
 * `field_config_overrides`, cộng vào bên trên các giá trị này — không thay
 * thế chúng (`field-rules.ts` là nơi cộng hai lớp).
 *
 * Mỗi module tự khai trường của mình ở một tệp riêng (vd.
 * `src/modules/coordinator/contracts/field-registry.ts`) và trả về mảng
 * `CoreFieldDefinition[]`; tệp này chỉ định nghĩa HÌNH DẠNG chung, không
 * hardcode trường của bất kỳ module nào — tránh field-platform phải import
 * ngược vào coordinator.
 *
 * Tệp thuần — không import Prisma.
 */

export type FieldEntity = "ORDER" | "PARTNER"

export type FieldDataType =
  | "TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "MONEY_VND"
  | "DATE"
  | "DATETIME"
  | "BOOLEAN"
  | "SELECT"
  | "MULTI_SELECT"
  | "PHONE"
  | "EMAIL"
  | "URL"
  | "IMAGE"
  | "FILE"
  // Trường lõi (khác trường tự tạo) được phép có thêm các kiểu mà cấu trúc
  // dữ liệu của nó không phải một giá trị đơn — địa chỉ nhiều tầng, id ảnh
  // đã có sẵn kiểu riêng trong domain. Trường tự tạo (CUSTOM) KHÔNG được
  // dùng hai kiểu này — `custom-field-schema.ts` chặn ở cổng tạo trường.
  | "STRUCTURED_ADDRESS"
  | "ASSET_REF"

export type FieldRequirementLevel = "OPTIONAL" | "RECOMMENDED" | "REQUIRED"

export type FieldSensitivity = "NORMAL" | "PII" | "SENSITIVE"

export type FieldAudience = "INTERNAL" | "PARTNER" | "SHIPPER" | "CUSTOMER"

export type FieldVisibility = Record<FieldAudience, boolean>

export const ALL_AUDIENCES: readonly FieldAudience[] = ["INTERNAL", "PARTNER", "SHIPPER", "CUSTOMER"]

/** Mặc định kín — chỉ nội bộ thấy, trừ khi khai rõ mở hơn (an toàn hơn khi quên khai). */
export const INTERNAL_ONLY_VISIBILITY: FieldVisibility = {
  INTERNAL: true,
  PARTNER: false,
  SHIPPER: false,
  CUSTOMER: false,
}

export interface FieldPlacement {
  readonly placement: string // vd. "T01.delivery", "T07.bom"
  readonly order: number
}

export interface CoreFieldDefinition {
  readonly key: string
  readonly entity: FieldEntity
  readonly dataType: FieldDataType
  readonly label: string
  // `| undefined` tường minh (không chỉ `?`) vì `tsconfig.json` bật
  // `exactOptionalPropertyTypes` — cần cho `row-mappers.ts` gán được
  // `row.description ?? undefined` (đọc từ DB, cột có thể NULL) vào đây.
  readonly description?: string | undefined
  readonly placeholder?: string | undefined
  readonly requirement: FieldRequirementLevel
  /** Bước bắt buộc phải có (Đặc tả trường T01-T27), nếu `requirement = REQUIRED`. */
  readonly requiredAtStage?: string | undefined
  readonly visibility: FieldVisibility
  readonly catalogKey?: string | undefined
  readonly sensitivity: FieldSensitivity
  /**
   * Mức sàn không cấu hình được (Đặc tả trường §16.2 mục 1): trường tiền
   * nhạy cảm (giá vốn, giá bán nội bộ…) — ghi đè theo tổ chức KHÔNG được
   * mở hiển thị ra PARTNER/SHIPPER/CUSTOMER dù cấu hình nói gì (`field-rules.ts`).
   */
  readonly floorInternalOnly?: boolean | undefined
  readonly placements?: readonly FieldPlacement[] | undefined
}

export function assertUniqueKeys(defs: readonly CoreFieldDefinition[]): void {
  const seen = new Set<string>()
  for (const def of defs) {
    if (seen.has(def.key)) {
      throw new Error(`Sổ đăng ký trường lõi có khoá trùng: ${def.key}`)
    }
    seen.add(def.key)
  }
}

/**
 * Kiểm tra tĩnh một định nghĩa trường lõi.
 *
 * PII/SENSITIVE không được mở cho PARTNER theo mặc định: đối tác xưởng sản
 * xuất không có nhu cầu nghiệp vụ nào với thông tin định danh khách hàng
 * (cùng loại lỗi đã sửa ở ĐP-1.1 cho giá bán). SHIPPER thì KHÁC — việc giao
 * hàng đòi hỏi chính SĐT/địa chỉ người nhận (`recipientPhone`,
 * `deliveryAddress` là PII nhưng `visibility.SHIPPER = true` là ĐÚNG, không
 * phải lỗi) nên không chặn PII cho SHIPPER ở đây; hai trường đó có nhạy cảm
 * thật thì dùng `floorInternalOnly` (chặn cả SHIPPER) thay vì `sensitivity`.
 *
 * `requiredAtStage` phải đi kèm `requirement = REQUIRED`.
 */
export function validateCoreFieldDefinition(def: CoreFieldDefinition): string[] {
  const problems: string[] = []
  if (def.requiredAtStage && def.requirement !== "REQUIRED") {
    problems.push(`${def.key}: có requiredAtStage nhưng requirement không phải REQUIRED`)
  }
  if (def.sensitivity !== "NORMAL" && def.visibility.PARTNER) {
    problems.push(`${def.key}: độ nhạy ${def.sensitivity} nhưng lại mở cho PARTNER trong lớp mã`)
  }
  if (def.floorInternalOnly && (def.visibility.PARTNER || def.visibility.SHIPPER || def.visibility.CUSTOMER)) {
    problems.push(`${def.key}: floorInternalOnly nhưng lại mở hiển thị ra ngoài INTERNAL trong lớp mã`)
  }
  return problems
}

export function listByEntity(
  defs: readonly CoreFieldDefinition[],
  entity: FieldEntity
): readonly CoreFieldDefinition[] {
  return defs.filter((d) => d.entity === entity)
}

export function findByKey(
  defs: readonly CoreFieldDefinition[],
  key: string
): CoreFieldDefinition | undefined {
  return defs.find((d) => d.key === key)
}
