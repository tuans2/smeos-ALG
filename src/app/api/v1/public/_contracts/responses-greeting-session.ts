import { z } from "zod"

import { productSnapshot, shippingSettings, shopInfo, vietQrInstructions } from "./responses-greeting-shared"

/** Phản hồi phiên khách Thẻ chào `/public/brochure/{sendCode}/*` (audit API đợt 6). */
export const brochureOpenedResponse = z.strictObject({ opened: z.boolean() })
export const brochureEventResponse = z.strictObject({ recorded: z.literal(true) })
export const brochureSelectResponse = z.strictObject({ success: z.literal(true), snapshot: productSnapshot })
export const paymentNotifyResponse = z.strictObject({ success: z.boolean(), message: z.string() })
export const paymentProofResponse = z.strictObject({ assetId: z.string(), url: z.string() })
export const brochureUnlockResponse = z.strictObject({ unlocked: z.literal(true) })
export const brochureReorderResponse = z.strictObject({ sendCode: z.string() })

export const brochureHistoryResponse = z.strictObject({
  data: z.strictObject({
    rootSendCode: z.string(),
    members: z.array(
      z.strictObject({
        sendCode: z.string(),
        createdAt: z.string(),
        available: z.boolean(),
        productName: z.string().nullable(),
        order: z
          .strictObject({ code: z.string(), status: z.string(), deliveryStatus: z.string(), totalVnd: z.number(), paidVnd: z.number(), deliveryDate: z.string().nullable() })
          .nullable(),
      })
    ),
  }),
})

const optionalText = z.string().nullable().optional()
const brochureProduct = z.strictObject({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  price: z.number().nullable(),
  imageUrl: z.string().nullable(),
  driveLink: optionalText,
  description: optionalText,
  meaning: optionalText,
  occasion: optionalText,
  style: optionalText,
  craftStyle: optionalText,
  flowersSummary: optionalText,
  category: optionalText,
  color: optionalText,
  dimensions: optionalText,
  wrapStyle: optionalText,
  sortOrder: z.number(),
  available: z.boolean().optional(),
  variants: z
    .array(
      z.strictObject({
        id: z.string(),
        name: z.string(),
        priceVnd: z.number(),
        peakPriceVnd: z.number().nullable().optional(),
        values: z.array(z.string()).optional(),
        imageUrl: z.string().nullable().optional(),
      })
    )
    .optional(),
  priceDimensions: z.array(z.strictObject({ label: z.string(), values: z.array(z.string()) })).optional(),
  priceMode: z.enum(["FIXED", "RANGE", "CONTACT"]).optional(),
  priceMaxVnd: z.number().nullable().optional(),
  peakPriceVnd: z.number().nullable().optional(),
  weekendIsPeak: z.boolean().optional(),
  priceHidden: z.boolean().optional(),
})

/** `GET /public/brochure/{sendCode}` — chỉ link đang mở mới 200; hết hạn/đóng/không có → 404. */
export const brochureViewResponse = z.strictObject({
  status: z.literal("ACTIVE"),
  session: z.strictObject({
    sendCode: z.string(),
    status: z.enum(["CREATED", "OPENED", "BROWSING", "SELECTED", "ORDER_SUBMITTED", "PAYMENT_REPORTED", "COMPLETED"]),
    customerName: z.string().nullable(),
    selectedProductId: z.string().nullable(),
    productSnapshot: productSnapshot.nullable(),
  }),
  shop: shopInfo,
  catalog: z.strictObject({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    filters: z.record(z.string(), z.unknown()).nullable().optional(),
  }),
  products: z.array(brochureProduct),
  order: z
    .strictObject({ id: z.string(), code: z.string(), status: z.string(), productionStatus: z.string().nullable().optional(), totalVnd: z.number(), paidVnd: z.number() })
    .nullable(),
  shipping: shippingSettings,
  payment: vietQrInstructions.nullable(),
  trackingTriggerPolicy: z.enum(["PAYMENT_ONLY", "PAYMENT_OR_COORDINATOR"]).optional(),
})
