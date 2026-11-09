import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { preflightBody } from "@/app/api/v1/_contracts/requests-misc"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getPrintPreset, runPreflightCheck, type PrintPresetCode } from "@/modules/print/domain/print-preset"

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  if (!hasCapability(ctx, "M5") && !hasCapability(ctx, "Q1")) {
    requireCapability(ctx, "M5")
  }

  const raw = await request.json().catch(() => null)
  if (!raw || typeof raw !== "object") {
    throw validationFailed({ body: "Dữ liệu yêu cầu không hợp lệ" })
  }

  const parsed = preflightBody.safeParse(raw)
  if (!parsed.success) {
    const details: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      details[issue.path.join(".")] = issue.message
    }
    throw validationFailed(details)
  }

  const preset = getPrintPreset(parsed.data.presetCode as PrintPresetCode)
  const report = runPreflightCheck(parsed.data, preset)

  return jsonResponse({ data: report })
})
