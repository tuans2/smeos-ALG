/**
 * POST /api/v1/public/catalog/[slug]/order — khách đặt hàng trên catalog/landing công khai (Đơn hàng đa nguồn P3).
 *
 * Công khai, không phiên. Tổ chức suy từ catalog trong use-case (A12); chỉ khi Điều hành bật nút Đặt hàng cho
 * nguồn này. Chặn máy: giới hạn tần suất theo IP + ô bẫy `website` + (khi bật) Cloudflare Turnstile + 5 đơn/giờ/SĐT.
 */

import { z } from "zod"
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { clientIp, enforceRateLimit } from "@/core/http/rate-limit"
import { issuesToDetails, rejectBotSubmission } from "@/modules/greeting-card/contracts/public-order-schema"
import { placePublicCatalogOrder } from "@/modules/orders/use-cases/place-public-catalog-order"
import { defineRoute } from "@/core/http/define-route"

const bodySchema = z.object({
  productId: z.string().max(64),
  quantity: z.number().int(),
  name: z.string().max(200),
  phone: z.string().max(20),
  address: z.string().max(600),
  deliveryDate: z.string().max(10).optional(),
  timeSlot: z.string().max(40).optional(),
  note: z.string().max(1000).optional(),
  verificationToken: z.string().max(4096).optional(),
  /** Ô bẫy máy tự điền */
  website: z.string().max(200).optional(),
})

export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "catalog-order", limit: 10, windowMs: 10 * 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { slug } = params as { slug: string }
    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed(issuesToDetails(parsed.error.issues))
    rejectBotSubmission(parsed.data)
    const { website: _bot, ...input } = parsed.data
    return jsonResponse(await placePublicCatalogOrder(slug, input, clientIp(request)), { status: 201 })
  },
})
