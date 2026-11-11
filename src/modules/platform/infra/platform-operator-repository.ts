import { prisma } from "@/core/tenancy/infra/prisma"

/**
 * `platform_operators` + `platform_role_capabilities` — bảng gán quyền
 * vận hành nền tảng, TÁCH HẲN khỏi `memberships`/`role_capabilities` của
 * tenant (D-N6). Không nhận `TenantContext`/`PlatformContext` ở tầng này:
 * đây là nơi hai ngữ cảnh đó ĐƯỢC DỰNG, không phải nơi dùng chúng.
 */
export class PlatformOperatorRepository {
  /**
   * Người vận hành đang hoạt động (chưa bị thu hồi) theo user_id, kèm tập
   * mã năng lực đã gán. Trả `null` nếu user không phải người vận hành —
   * tầng trên dịch `null` thành "không có PlatformContext", không phải lỗi.
   */
  async findActiveByUserId(
    userId: string
  ): Promise<{ operatorId: string; capabilityCodes: string[] } | null> {
    const operator = await prisma.platform_operators.findFirst({
      where: { user_id: userId, revoked_at: null },
      include: { capabilities: true },
    })
    if (!operator) return null
    return {
      operatorId: operator.id,
      capabilityCodes: operator.capabilities.map((c: { capability_code: string }) => c.capability_code),
    }
  }

  /** Dùng bởi `scripts/gan-van-hanh-nen-tang.ts` — chạy tay, không qua API. */
  async grant(userId: string, capabilityCodes: string[], grantedBy: string | null): Promise<string> {
    // Người vận hành đầu tiên của bản cài mới tự đăng ký nên còn chờ duyệt, mà chỉ người vận hành mới duyệt
    // được. Gán quyền (công cụ chạy tay, cần quyền CSDL) duyệt luôn tài khoản đó; tài khoản bị từ chối giữ nguyên.
    await prisma.users.updateMany({
      where: { id: userId, approval_status: "PENDING" },
      data: { approval_status: "APPROVED", approval_decided_at: new Date(), approval_decided_by: grantedBy },
    })
    const operator = await prisma.platform_operators.upsert({
      where: { user_id: userId },
      update: { revoked_at: null },
      create: { user_id: userId, granted_by: grantedBy },
    })
    for (const code of capabilityCodes) {
      await prisma.platform_role_capabilities.upsert({
        where: { operator_id_capability_code: { operator_id: operator.id, capability_code: code } },
        update: {},
        create: { operator_id: operator.id, capability_code: code },
      })
    }
    return operator.id
  }
}

let _platformOperatorRepo: PlatformOperatorRepository | null = null
export function getPlatformOperatorRepository(): PlatformOperatorRepository {
  if (!_platformOperatorRepo) _platformOperatorRepo = new PlatformOperatorRepository()
  return _platformOperatorRepo
}
