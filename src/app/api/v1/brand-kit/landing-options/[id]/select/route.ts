import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { selectLandingOption } from "@/modules/brand-kit/use-cases/landing-options"

/** POST /api/v1/brand-kit/landing-options/[id]/select (J1) — chủ tiệm chọn và xuất bản Landing page chính thức. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "J1" },
  rateLimit: { scope: "brand-kit-landing-select", limit: 20, windowMs: 60_000, per: "user" },
  handler: async ({ ctx, params }) => ok(await selectLandingOption(ctx, params.id ?? "")),
})
