import { jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { builtInMotherLayer, isGovernanceSystem, parseDecisions, validateDecisions } from "@/modules/organization/domain/governance-decisions"
import { getMotherGovernance, saveMotherGovernance } from "@/modules/organization/infra/governance-decisions-repository"
import { defineRoute } from "@/core/http/define-route"

function systemFrom(request: Request) {
  const system = new URL(request.url).searchParams.get("system")
  if (!isGovernanceSystem(system)) throw validationFailed({ reason: "Thiếu hoặc sai loại ma trận" })
  return system
}

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "chỉ đọc — mọi người vận hành nền tảng" },
  handler: async ({ request }) => {
    const system = systemFrom(request)
    // Quy chuẩn bất biến hiện như khoá của tầng trên để Console không cho sửa
    return jsonResponse({ data: { system, tier: "MOTHER", own: await getMotherGovernance(system), upper: [builtInMotherLayer(system)] } })
  },
})

/** Quyết định của tầng Mẹ áp xuống MỌI tổ chức — cần mã quản trị cấu hình N12. */
export const PUT = defineRoute({
  auth: { kind: "platform", capability: "N12" },
  handler: async ({ request, pctx }) => {
    const system = systemFrom(request)
    const body = (await request.json().catch(() => null)) as { decisions?: unknown } | null
    const next = parseDecisions(body?.decisions)
    const violations = validateDecisions(next, "MOTHER", [builtInMotherLayer(system)])
    if (violations.length > 0) throw validationFailed({ violations })
    const before = await getMotherGovernance(system)
    await saveMotherGovernance(system, next, pctx.userId)
    try {
      await recordPlatformAuditLog(pctx, {
        action: "platform.governance_matrix.update",
        entityType: "GOVERNANCE_MATRIX",
        entityId: system,
        before,
        after: next,
      })
    } catch {
      // Không làm gián đoạn việc lưu nếu audit log ghi lỗi
    }
    return jsonResponse({ data: { system, tier: "MOTHER", own: next, upper: [builtInMotherLayer(system)] } })
  },
})

export const dynamic = "force-dynamic" as const
