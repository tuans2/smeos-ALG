import { handle, jsonResponse } from "@/core/http/response"
import { log } from "@/core/observability/log"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { UX_ROLLOUT_FLAG_KEYS } from "@/modules/platform/domain/ux-rollout-flags"
import { getUxRolloutFlags, saveUxRolloutFlags } from "@/modules/platform/infra/ux-rollout-flag-store"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"

export const GET = handle(async (request) => {
  await requirePlatformContext(request)
  return jsonResponse({ data: { keys: UX_ROLLOUT_FLAG_KEYS, flags: await getUxRolloutFlags() } })
})

export const PUT = handle(async (request) => {
  const pctx = await requirePlatformContext(request)
  // Bật/tắt giao diện mới cho tổ chức khác — cần mã quản trị cấu hình như ma trận điều hướng
  requirePlatformCapability(pctx, "N12")
  const body = (await request.json()) as { flags?: unknown }

  const before = await getUxRolloutFlags()
  const after = await saveUxRolloutFlags(body?.flags ?? {}, pctx.userId)

  try {
    await recordPlatformAuditLog(pctx, {
      action: "platform.ux_rollout_flags.update",
      entityType: "UX_ROLLOUT_FLAGS",
      entityId: "PLATFORM_GLOBAL",
      before,
      after,
    })
  } catch (error) {
    // Không làm gián đoạn việc lưu nếu audit log ghi lỗi — nhưng phải để lại dấu vết: thay đổi cấu hình
    // toàn sàn không có dòng audit là lỗ hổng truy vết (audit API-17, 07/11/2026).
    log.error("platform.audit_write_failed", {
      action: "platform.ux_rollout_flags.update",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return jsonResponse({ data: { ok: true, flags: after } })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
