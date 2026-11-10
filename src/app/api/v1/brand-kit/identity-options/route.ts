
import { created } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { brandOptionsBody } from "@/app/api/v1/_contracts/requests-brand"
import { generateIdentityOptions } from "@/modules/brand-kit/use-cases/identity-options"

/**
 * POST /api/v1/brand-kit/identity-options (F2) — sinh phương án Bộ nhận diện từ Hồ sơ cửa hàng.
 * `initial`/`refresh`: 3 phương án miễn phí. `extra`: 1 phương án, trừ credit — bắt buộc header Idempotency-Key.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  rateLimit: { scope: "brand-kit-identity", limit: 20, windowMs: 60_000, per: "user" },
  body: brandOptionsBody,
  handler: async ({ ctx, body: b, idempotencyKey }) => created(await generateIdentityOptions(ctx, { mode: b.mode, idempotencyKey })),
})
