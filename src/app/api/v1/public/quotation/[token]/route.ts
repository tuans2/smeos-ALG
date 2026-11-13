import { notFound } from "@/core/http/errors"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { jsonResponse } from "@/core/http/response"
import { isQuotationExpired } from "@/modules/sales/domain/quotation"
import { getQuotationRepository } from "@/modules/sales/infra/quotation-repository"
import { defineRoute } from "@/core/http/define-route"

/**
 * Xem báo giá qua link công khai. Không có phiên đăng nhập: quyền xem là token
 * ngẫu nhiên 256 bit trong URL. Báo giá nháp không xem được; dữ liệu trả về không
 * có số điện thoại, ghi chú nội bộ hay mã tổ chức.
 */
export const GET = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "public-quotation", limit: 60, windowMs: 60_000, per: "ip" },
  handler: async ({ params: routeParams }) => {
    const { token } = routeParams as { token: string }
    if (!token || typeof token !== "string" || token.length > 128) {
      throw notFound()
    }

    const quotation = await getQuotationRepository().findPublicByToken(token)
    if (!quotation) {
      throw notFound()
    }

    const isExpired = isQuotationExpired(quotation)
    return jsonResponse({
      data: {
        ...quotation,
        status: isExpired && quotation.status !== "CONVERTED" ? "EXPIRED" : quotation.status,
      },
    })
  },
})
