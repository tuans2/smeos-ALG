
import { created } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { brandOptionsBody } from "@/app/api/v1/_contracts/requests-brand"
import { generateLandingOptions } from "@/modules/brand-kit/use-cases/landing-options"

/**
 * POST /api/v1/brand-kit/landing-options (J7) — sinh phương án Landing page chính thức từ Hồ sơ + Bộ nhận diện.
 * `initial`/`refresh`: 3 phương án miễn phí. `extra`: 1 phương án, trừ credit — bắt buộc header Idempotency-Key.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "J7" },
  rateLimit: { scope: "brand-kit-landing", limit: 10, windowMs: 60_000, per: "user" },
  body: brandOptionsBody,
  handler: async ({ ctx, body: b, idempotencyKey }) => created(await generateLandingOptions(ctx, { mode: b.mode, idempotencyKey })),
})
