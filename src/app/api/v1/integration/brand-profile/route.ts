import { jsonResponse } from "@/core/http/response"
import {
  toTenantContext,
} from "@/modules/integration/use-cases/resolve-integration-context"
import { getBrandProfile } from "@/modules/profiles/use-cases/get-brand-profile"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET /integration/brand-profile` (đặc tả 08 mục 4: "BrandProfile |
 * LocalBudd, SocialFlow") — cả hai loại token đọc được, `design_contracts`
 * của `LocalBudd` và M04b/M07 của `SocialFlow` đều cần bốn màu/font/tông
 * giọng (đặc tả 08 mục 4b).
 */
export const GET = defineRoute({
  auth: { kind: "integration" },
  handler: async ({ ic }) => {
    const ctx = await toTenantContext(ic)
    return jsonResponse(await getBrandProfile(ctx))
  },
})
