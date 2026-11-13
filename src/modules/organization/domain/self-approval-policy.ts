/**
 * Công tắc `cho_phep_tu_duyet` — đặc tả 02 mục 2, `YC-Q9`.
 *
 * Điều hành là tập cha của Sale và Điều phối (đặc tả 02 mục 2), nên Điều
 * hành có năng lực duyệt (`H3`, `I2`, …) trên cả việc do chính mình tạo. Công
 * tắc này không đổi năng lực — nó chỉ quyết định một bản ghi tự tạo có HIỆN
 * trong hàng đợi duyệt của chính người tạo hay không (đặc tả 06 mục 9). Bật
 * thì Điều hành duyệt được việc của chính mình; tắt thì bản ghi biến mất khỏi
 * hàng đợi của chính họ — người khác có năng lực duyệt vẫn thấy và duyệt
 * được bình thường.
 *
 * Mọi hành động duyệt, tự duyệt hay không, đều ghi `audit_logs` (P3) — đó là
 * cách duy nhất truy trách nhiệm khi Điều hành duyệt việc của chính mình.
 *
 * Tệp này thuần: không import Prisma, test không cần cơ sở dữ liệu.
 */

export const SELF_APPROVAL_SETTINGS_KEY = "cho_phep_tu_duyet" as const

export type OrganizationSettings = Record<string, unknown> | null | undefined

/**
 * Mặc định KHÔNG cho tự duyệt (PO 04/11/2026, checklist ALG 9.12): phiếu đề xuất do ai tạo thì người
 * khác duyệt. Tổ chức nhỏ một người điều hành có thể bật lại công tắc.
 */
const DEFAULT_ALLOW_SELF_APPROVAL = false

export function isSelfApprovalAllowed(settings: OrganizationSettings): boolean {
  const value = settings?.[SELF_APPROVAL_SETTINGS_KEY]
  if (typeof value === "boolean") return value
  return DEFAULT_ALLOW_SELF_APPROVAL
}

/**
 * Một bản ghi có hiện trong hàng đợi duyệt của `actorId` hay không. Không
 * thay cho `requireCapability` — actor vẫn phải có mã duyệt trước khi câu hỏi
 * này còn ý nghĩa.
 */
export function isVisibleInApprovalQueue(input: {
  readonly actorId: string
  readonly createdBy: string
  readonly settings: OrganizationSettings
}): boolean {
  if (input.actorId !== input.createdBy) return true
  return isSelfApprovalAllowed(input.settings)
}

/**
 * Người thao tác có đang tự duyệt phiếu do chính mình tạo hay không. Trả thông điệp tiếng Việt khi bị
 * chặn, `null` khi được phép. Dùng cho mọi luồng duyệt phiếu (giảm giá, huỷ đơn, đề xuất sửa mẫu,
 * giao trước thu sau) — kiểm SAU `requireCapability`.
 */
export function selfApprovalBlocked(input: {
  readonly actorId: string
  readonly requesterId: string | null | undefined
  readonly settings: OrganizationSettings
}): string | null {
  if (!input.requesterId || input.actorId !== input.requesterId) return null
  if (isSelfApprovalAllowed(input.settings)) return null
  return "Không tự duyệt phiếu do chính bạn tạo — cần người khác có quyền duyệt"
}
