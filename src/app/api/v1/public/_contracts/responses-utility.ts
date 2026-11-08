import { z } from "zod"

/**
 * Phản hồi nhóm tiện ích & webhook công khai (audit API đợt 6, PO 07/11/2026). Suy từ phản hồi thật
 * (`tests/tenant/public-contract-utility.test.ts`, chế độ `CAPTURE_CONTRACT_DIR`) rồi đối chiếu kiểu TS của
 * use-case; khai `strictObject` nên trường mới chưa ghi ở đây làm test hợp đồng đỏ.
 */
const timestamp = z.iso.datetime()
const optionalText = z.string().optional()

export const driveThumbnailResponse = z.strictObject({
  folder_id: z.string(),
  /** `null` khi thư mục không có ảnh nào. */
  file_id: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
})

/** Cổng webhook chung của Trung tâm Tích hợp: số sự kiện nhận mới / bỏ qua vì trùng. */
export const inboundWebhookResponse = z.strictObject({
  accepted: z.number().int(),
  duplicates: z.number().int(),
})

export const sepayWebhookResponse = z.strictObject({
  success: z.literal(true),
  status: z.enum(["RECEIVED", "MATCHED", "UNMATCHED", "IGNORED"]),
  /** `true` khi SePay gửi lại giao dịch đã nhận. */
  duplicate: z.boolean(),
  orderCode: z.string().optional(),
})

export const zaloOaWebhookResponse = z.strictObject({ ok: z.literal(true) })

// ── Marketplace đối tác (bản che thông tin liên hệ) — theo `PartnerStoreMarketplaceEntity` ──────────
const storeAudit = z.strictObject({ timestamp: z.string(), specialist: z.string(), surveyDate: z.string(), surveyType: z.string(), notes: optionalText })
const storeIdentity = z.strictObject({
  shopName: z.string(), legalName: optionalText, taxCode: optionalText, ownerName: z.string(), contactPerson: z.string(),
  operatingYears: z.string(), scale: z.string(), legalCompliance: optionalText,
})
const storeContact = z.strictObject({ phone: z.string(), email: optionalText, address: z.string(), googleMaps: optionalText })
const optionalTextFields = (keys: readonly string[]) => z.strictObject(Object.fromEntries(keys.map((k) => [k, optionalText])))
const storeDigital = optionalTextFields(["facebook", "tiktok", "website", "googleReview", "facebookFollowers", "tiktokFollowers", "postingFrequency", "onlineOrderChannels", "adsAndLivestream"])
const storeBusiness = optionalTextFields(["monthlyRevenue", "dailyOrdersNormal", "dailyOrdersPeak", "aov", "targetCustomers", "b2bShare", "customerSources", "paymentMethods", "challenges", "goals12m", "algExpectations", "cooperationWishes"])
const storeProduction = z.strictObject({
  productLines: z.array(z.string()),
  ...Object.fromEntries(["mainProductLine", "floristCount", "leadFloristExperience", "maxCapacityNormal", "maxCapacityPeak", "flowerSupply", "mainFlowerSource", "importFrequency", "rareFlowerAbility", "inboundProcess", "freshnessDuration", "lossRateEstimate", "nearExpireHandling"].map((k) => [k, optionalText])),
})
const storeFacility = optionalTextFields(["coolers", "coldStorage", "premises", "space", "equipment", "staffing", "deliveryVehicles", "deliveryRadius", "deliveryCommitmentTime", "coldDeliveryAbility", "deliveryFeePolicy"])
const storeMedia = z.strictObject({
  requiredPhotoTypes: optionalText, coverPhotoUrl: optionalText, photoGalleryUrls: z.array(z.string()).optional(),
  rawImageUrls: optionalText, driveImageIds: z.array(z.string()), requiredDocuments: optionalText,
})
const storeScore = z.strictObject({
  ...Object.fromEntries(["skillAndCraftScore", "processFacilityScore", "supplyStorageScore", "productionDeliveryScore", "legalDigitalScore", "disciplineCooperationScore", "totalScore", "additionalNotes"].map((k) => [k, optionalText])),
  suggestedTier: z.string(),
})
const marketplaceStore = z.strictObject({
  id: z.string(), audit: storeAudit, identity: storeIdentity, contact: storeContact, digital: storeDigital, business: storeBusiness,
  production: storeProduction, facilityAndDelivery: storeFacility, media: storeMedia, scoreAndTier: storeScore,
})

export const marketplaceShareResponse = z.strictObject({
  data: z.strictObject({ stores: z.array(marketplaceStore), total: z.number().int(), expiresAt: timestamp }),
})

// ── Báo giá công khai — theo `PublicQuotationView` (không số điện thoại, không ghi chú nội bộ) ──────
export const publicQuotationResponse = z.strictObject({
  data: z.strictObject({
    code: z.string(),
    status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED"]),
    validUntil: timestamp.nullable(),
    subtotal: z.number(),
    discountAmount: z.number(),
    shippingFee: z.number(),
    totalAmount: z.number(),
    terms: z.string().nullable(),
    createdAt: timestamp,
    recipientName: z.string().nullable(),
    items: z.array(
      z.strictObject({
        id: z.string(),
        name: z.string(),
        variantLabel: z.string().nullable(),
        qty: z.number(),
        unitPrice: z.number(),
        totalPrice: z.number(),
        note: z.string().nullable(),
        imageUrl: z.string().nullable(),
        composition: z.array(z.string()),
      })
    ),
  }),
})
