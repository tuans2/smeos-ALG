import { hardCapOf } from "./capability-catalog"

export type CapabilityScope = "ORGANIZATION" | "BRANCH" | "STORE" | "FLOWER_NETWORK"

export interface CapabilityGrant {
  readonly code: string
  readonly scope: CapabilityScope
}

/**
 * Lớp ba — trần cứng, cắt sau cùng (đặc tả 02 mục 1, `YC-Q2` `YC-Q3`).
 *
 * `roleKey` là `roles.key` đang xét. Trần cứng đặt tên các khoá vai HỆ THỐNG
 * cụ thể (`dieu_hanh`, đôi khi kèm `dieu_phoi`) — không có khái niệm "vai
 * tương đương Điều hành". Vai riêng của tổ chức mang khoá tự đặt, không khớp
 * bất kỳ trần cứng nào, nên một năng lực có trần cứng không bao giờ mở được
 * cho vai riêng — kể cả khi bảng công tắc của tổ chức bật nó. Đây là lựa chọn
 * an toàn có chủ đích, không phải thiếu sót; xem `docs/dac-ta/TECHNICAL_DEBT.md`
 * nếu sản phẩm cần một khái niệm "trần theo cấp bậc" cho vai riêng sau này.
 */
/**
 * Sàn của vai Điều hành (audit API §30): `F1` (xem tổ chức, danh sách vai) và `F5` (sửa vai) không tắt được trên vai
 * `dieu_hanh`. Thiếu sàn này Điều hành tự bỏ `F5` khỏi vai của mình rồi không bật lại được — tổ chức chỉ có tài khoản
 * Điều hành mất hẳn quyền chỉnh vai. Còn `F5` thì mọi mã khác đều bật lại được.
 */
export const OWNER_ROLE_FLOOR: Readonly<Record<string, readonly string[]>> = { dieu_hanh: ["F1", "F5"] }

/** `true` khi tắt `code` trên vai `roleKey` sẽ xuyên sàn. */
export function breaksRoleFloor(code: string, roleKey: string): boolean {
  return OWNER_ROLE_FLOOR[roleKey]?.includes(code) ?? false
}

export function passesHardCap(code: string, roleKey: string): boolean {
  const cap = hardCapOf(code)
  if (!cap) return true
  return (cap as readonly string[]).includes(roleKey)
}

/**
 * Áp lớp ba lên một switchboard đã gộp (lớp một + lớp hai). Mã bị trần cứng
 * chặn với vai này bị loại khỏi kết quả dù đang "bật" ở đầu vào — không đường
 * nào từ giao diện hay cơ sở dữ liệu mở lại được nó.
 */
export function applyHardCap(
  roleKey: string,
  grants: ReadonlyMap<string, CapabilityScope>
): CapabilityGrant[] {
  const out: CapabilityGrant[] = []
  for (const [code, scope] of grants) {
    if (passesHardCap(code, roleKey)) out.push({ code, scope })
  }
  return out.sort((a, b) => a.code.localeCompare(b.code))
}

/**
 * Gộp lớp một (đã seed sẵn trong `role_capabilities`) với lớp hai — ngoại lệ
 * theo tổ chức (`capability_overrides`). `allowed = true` bật thêm một mã dù
 * chưa có ở lớp một; `allowed = false` tắt một mã đang bật. Không áp trần
 * cứng ở đây — gọi `applyHardCap` sau, ở `CapabilityRepository.resolveGrants`.
 */
export function mergeOverrides(
  base: ReadonlyMap<string, CapabilityScope>,
  overrides: ReadonlyArray<{ capability_code: string; allowed: boolean }>
): Map<string, CapabilityScope> {
  const merged = new Map(base)
  for (const override of overrides) {
    if (override.allowed) {
      if (!merged.has(override.capability_code)) {
        merged.set(override.capability_code, "ORGANIZATION")
      }
    } else {
      merged.delete(override.capability_code)
    }
  }
  return merged
}
