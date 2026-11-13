import { z } from "zod"
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { getMarketingKpisUseCase } from "@/modules/marketing-center/use-cases/get-marketing-kpis.use-case"
import type { KpiTimeWindow } from "@/modules/marketing-center/domain/kpi-definitions"
import { defineRoute } from "@/core/http/define-route"

const timeWindowSchema = z.enum(["7D", "30D", "90D", "ALL"]).default("30D")

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: M1, Q1" },
  handler: async ({ request, ctx }) => {
    if (!hasCapability(ctx, "M1") && !hasCapability(ctx, "Q1")) {
      requireCapability(ctx, "M1")
    }

    const url = new URL(request.url)
    const rawWindow = url.searchParams.get("time_window") ?? "30D"
    const parsed = timeWindowSchema.safeParse(rawWindow)
    if (!parsed.success) {
      throw validationFailed({ time_window: "time_window phải là 7D, 30D, 90D hoặc ALL" })
    }

    const result = await getMarketingKpisUseCase(ctx, {
      timeWindow: parsed.data as KpiTimeWindow,
    })

    return jsonResponse({ data: result })
  },
})

