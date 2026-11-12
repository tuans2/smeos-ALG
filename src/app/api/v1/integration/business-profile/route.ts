import { jsonResponse } from "@/core/http/response"
import {
  requireIntegrationClient,
  toTenantContext,
} from "@/modules/integration/use-cases/resolve-integration-context"
import { getBusinessProfile } from "@/modules/profiles/use-cases/get-business-profile"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET /integration/business-profile` (đặc tả 08 mục 4: "BusinessProfile |
 * LocalBudd").
 *
 * Lời gọi bằng token máy gọi máy: chỉ token `LOCALBUDD` đọc được —
 * `SocialFlow` không cần hồ sơ kinh doanh (địa chỉ, giờ mở cửa…) cho M04b/M07.
 * Lời gọi thay mặt người dùng (`X-ALG-SSO`): gác bằng năng lực thật của
 * người đó thay vì bằng tên app, xem `requireIntegrationClient`.
 */
export const GET = defineRoute({
  auth: { kind: "integration" },
  handler: async ({ ic }) => {
    requireIntegrationClient(ic, "LOCALBUDD")
    const ctx = await toTenantContext(ic)
    return jsonResponse(await getBusinessProfile(ctx))
  },
})
