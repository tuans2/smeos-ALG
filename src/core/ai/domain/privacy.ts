/**
 * Sàn quyền riêng tư — đặc tả 10 mục 10, quyết định D17 ràng buộc thứ năm.
 *
 * Sàn cắt SAU CÙNG, cùng vị trí và cùng tính chất với trần cứng của RBAC:
 * không đường nào từ cấu hình, chính sách hay bước dự phòng mở được một lời
 * gọi `SENSITIVE` ra nhà cung cấp bên ngoài (`YC-G11`, `YC-G12`).
 */
import type { AiPrivacyLevel } from "./ai-capabilities"

const RANK: Record<AiPrivacyLevel, number> = { PUBLIC: 0, SHOP: 1, SENSITIVE: 2 }

/** Mức cao nhất trong các mức truyền vào. Không có mức nào thì `SHOP`. */
export function effectivePrivacyFloor(
  ...levels: ReadonlyArray<AiPrivacyLevel | null | undefined>
): AiPrivacyLevel {
  const present = levels.filter((level): level is AiPrivacyLevel => Boolean(level))
  if (present.length === 0) return "SHOP"
  return present.reduce((a, b) => (RANK[a] >= RANK[b] ? a : b))
}

/**
 * Mô hình có được phép chạy dưới một sàn không.
 *
 * `SENSITIVE` đòi mô hình KHÔNG đưa dữ liệu rời hạ tầng. Hai mức còn lại
 * không cấm nhà cung cấp ngoài — điều khoản lưu trữ và huấn luyện của nhà
 * cung cấp đã được soát ở ma trận chọn công nghệ (`YC-V3`) trước khi mô hình
 * có hàng trong sổ đăng ký.
 */
export function modelAllowedUnderFloor(
  model: { readonly leavesInfra: boolean },
  floor: AiPrivacyLevel
): boolean {
  if (floor === "SENSITIVE") return model.leavesInfra === false
  return true
}
