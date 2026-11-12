import { z } from "zod"

import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { getBusinessProfile } from "@/modules/profiles/use-cases/get-business-profile"
import { getApprovedSellingNotes } from "@/modules/product-copies/use-cases/get-approved-selling-notes"
import { executeGenerateCatalogContent } from "@/modules/content-engine/use-cases/generate-catalog-content.use-case"
import { defineRoute } from "@/core/http/define-route"

const requestSchema = z.object({
  collectionName: z.string().min(1),
  occasion: z.string().optional(),
  productCount: z.number().int().nonnegative().default(0),
  styleVariant: z.enum(["EDITORIAL_LOOKBOOK", "MODERN_SHOWROOM", "COMPACT_LIST"]).default("MODERN_SHOWROOM"),
  userDirectives: z.string().optional(),
  /** Chỉ để máy chủ tự đọc mô tả bán hàng đã duyệt của tenant */
  productIds: z.array(z.string().min(1).max(64)).max(50).optional(),
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "J7" },
  handler: async ({ request, ctx }) => {
    const body = await request.json().catch(() => null)
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }

    const [bizProfile, sellingNotes] = await Promise.all([
      getBusinessProfile(ctx).catch(() => null),
      // Thiếu quyền đọc dữ liệu bán hàng (H5) hoặc lỗi → viết như cũ
      getApprovedSellingNotes(ctx, parsed.data.productIds ?? []).catch(() => new Map<string, string>()),
    ])
    const shopName = bizProfile?.display_name || "Tiệm Sản Phẩm"

    const result = await executeGenerateCatalogContent(
      {
        shopName,
        collectionName: parsed.data.collectionName,
        occasion: parsed.data.occasion,
        productCount: parsed.data.productCount,
        styleVariant: parsed.data.styleVariant,
        userDirectives: parsed.data.userDirectives,
        sellingNotes: [...sellingNotes.values()],
      },
      ctx
    )

    return jsonResponse({
      data: result,
    })
  },
})
