/**
 * Gán quyền vận hành nền tảng cho một tài khoản đã có — dùng bởi công cụ chạy tay `npm run gan-van-hanh-nen-tang`.
 *
 * Hệ thống mới dựng chưa có người vận hành nào để duyệt đăng ký, nên tài khoản đầu tiên kẹt ở "chờ duyệt" mãi
 * (Bước 6 bàn giao GD1). Người chạy công cụ này là chủ hệ thống, chạy phía máy chủ: tài khoản đang chờ duyệt
 * được duyệt luôn cùng lúc gán quyền. Tài khoản đã bị từ chối thì không tự mở lại.
 */
import { AccountApprovalRepository } from "../infra/account-approval-repository"
import { PlatformOperatorRepository } from "../infra/platform-operator-repository"

export interface GrantOperatorResult {
  operatorId: string
  /** Tài khoản vừa được duyệt trong lần gán này. */
  approved: boolean
  /** Chỉ có khi tài khoản là "dùng thử" (không có mật khẩu): hiện một lần cho người chạy công cụ. */
  temporaryPassword?: string
}

export async function grantPlatformOperator(
  user: { id: string; approval_status: string },
  capabilityCodes: readonly string[],
  grantedBy: string | null,
  deps = { operators: new PlatformOperatorRepository(), approvals: new AccountApprovalRepository() },
): Promise<GrantOperatorResult> {
  if (user.approval_status === "REJECTED") {
    throw new Error("Tài khoản này đã bị từ chối khi duyệt đăng ký — không tự mở lại khi gán quyền vận hành.")
  }
  // Duyệt TRƯỚC khi gán quyền: `decide` đòi bản ghi còn PENDING, còn `grant` chỉ duyệt bản ghi còn PENDING —
  // chạy theo thứ tự này thì mỗi tài khoản chỉ được duyệt một lần, dù gọi qua use-case hay gọi `grant` trực tiếp.
  if (user.approval_status !== "PENDING") {
    return { operatorId: await deps.operators.grant(user.id, [...capabilityCodes], grantedBy), approved: false }
  }
  const decision = await deps.approvals.decide(user.id, "APPROVE", grantedBy ?? user.id)
  const operatorId = await deps.operators.grant(user.id, [...capabilityCodes], grantedBy)
  return { operatorId, approved: true, ...(decision.temporaryPassword ? { temporaryPassword: decision.temporaryPassword } : {}) }
}
