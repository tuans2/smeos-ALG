import { AppError, unauthenticated } from "@/core/http/errors"
import { readSessionCookie } from "@/core/http/cookies"
import type { PlatformContext } from "@/core/platform/platform-context"
import { isUsable } from "@/modules/organization/domain/session-policy"
import { SessionRepository, getSessionRepository } from "@/modules/organization/infra/session-repository"
import { hashSessionToken } from "@/modules/organization/infra/session-token"
import { UserRepository, getUserRepository } from "@/modules/organization/infra/user-repository"
import { PlatformOperatorRepository, getPlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

/**
 * Giải `PlatformContext` — NGỮ CẢNH SONG SONG với `resolveSession`
 * (chốt 18/09), không nhánh từ nó. Đọc CÙNG cookie phiên
 * (`floraos_session`) vì người vận hành đăng nhập bằng đúng một tài khoản
 * như mọi người, nhưng KHÔNG đọc `sessions.organization_id` — một phiên
 * đang gắn tổ chức AVI GIFT ở tab khác vẫn giải được `PlatformContext` ở
 * đây, vì hai bảng nguồn (`memberships` và `platform_operators`) độc lập.
 *
 * Vì sao không nhánh từ `resolveSession`: nhánh "chưa chọn tổ chức" mà
 * thiết kế gốc (`docs/kien-truc/DASHBOARD_VAN_HANH_NEN_TANG.md` mục 3)
 * giả định sẽ không bao giờ chạy cho một tài khoản đồng thời là thành
 * viên một tổ chức — `log-in.ts` luôn gắn membership đầu tiên vào phiên.
 * Xem kế hoạch mục 2.1.
 *
 * Hai lỗi khác nhau có chủ đích (ca thử cách ly, kế hoạch mục 5.1 ca 1):
 * chưa đăng nhập → 401 UNAUTHENTICATED; đã đăng nhập nhưng không phải
 * người vận hành → 403 CAPABILITY_DENIED, giống hệt cách một thành viên
 * tổ chức thiếu một mã năng lực bị chặn, không phải bị coi là "chưa xác
 * thực".
 */
export async function requirePlatformContext(request: Request): Promise<PlatformContext> {
  const token = readSessionCookie(request)
  if (!token) throw unauthenticated()

  const session = await getSessionRepository().findByTokenHash(hashSessionToken(token))
  if (!session || !isUsable(session, new Date())) throw unauthenticated()

  const user = await getUserRepository().findById(session.user_id)
  if (!user) throw unauthenticated()

  // Quyền vận hành CHỈ đến từ `platform_operators` — ở mọi môi trường (P0-04, ARC-003). Trước đây
  // ngoài production, email đuôi `@dev.com` hoặc cookie `alg_dev_role` tự có mã N: môi trường thử
  // nào mở ra Internet cũng thành console xuyên tổ chức cho người lạ. Máy dev cấp quyền bằng seed
  // dev (`prisma/seed/sync-siin-store.ts`) hoặc `npm run gan-van-hanh-nen-tang`.
  const operator = await getPlatformOperatorRepository().findActiveByUserId(user.id)
  if (!operator) {
    throw new AppError("CAPABILITY_DENIED", "Không phải người vận hành nền tảng", {
      userId: user.id,
    })
  }

  return { userId: user.id, capabilities: new Set(operator.capabilityCodes) }
}

/** Dùng khi ngữ cảnh nền tảng là tuỳ chọn (chưa có nơi dùng ở P25a). */
export async function resolvePlatformSession(request: Request): Promise<PlatformContext | null> {
  try {
    return await requirePlatformContext(request)
  } catch {
    return null
  }
}
