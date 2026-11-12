import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { preflightBody } from "@/app/api/v1/_contracts/requests-misc"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { getPrintPreset, runPreflightCheck, type PrintPresetCode } from "@/modules/print/domain/print-preset"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: M5, Q1" },
  handler: async ({ request, ctx }) => {
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
    const input = camelKeys(parsed.data)

    const preset = getPrintPreset(input.presetCode as PrintPresetCode)
    const report = runPreflightCheck(input, preset)

    return jsonResponse({ data: report })
  },
})
