import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { selectIdentityOption } from "@/modules/brand-kit/use-cases/identity-options"

/** POST /api/v1/brand-kit/identity-options/[id]/select (F2) — chọn phương án làm Bộ nhận diện chính thức. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  rateLimit: { scope: "brand-kit-identity-select", limit: 30, windowMs: 60_000, per: "user" },
  handler: async ({ ctx, params }) => ok(await selectIdentityOption(ctx, params.id ?? "")),
})
