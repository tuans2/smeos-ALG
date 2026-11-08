import { z } from "zod"

/**
 * Phản hồi Console Vận hành Nền tảng — chợ đối tác (khảo sát cửa hàng) và dữ liệu tổ chức (Kho dữ liệu, legal hold)
 * (OpenAPI `/platform/*`, PO 07/11/2026).
 */
const timestamp = z.iso.datetime()
const data = <T extends z.ZodType>(schema: T) => z.strictObject({ data: schema })
const opt = z.string().optional()

/** Hồ sơ khảo sát cửa hàng — nhiều trường tuỳ chọn vì phiếu khảo sát không bắt buộc đủ mục. */
const marketplaceStore = z.strictObject({
  id: z.string(),
  audit: z.strictObject({ timestamp: z.string(), specialist: z.string(), surveyDate: z.string(), surveyType: z.string(), notes: opt }),
  identity: z.strictObject({
    shopName: z.string(),
    legalName: opt,
    taxCode: opt,
    ownerName: z.string(),
    contactPerson: z.string(),
    operatingYears: z.string(),
    scale: z.string(),
    legalCompliance: opt,
  }),
  contact: z.strictObject({ phone: z.string(), email: opt, address: z.string(), googleMaps: opt }),
  digital: z.strictObject({
    facebook: opt,
    tiktok: opt,
    website: opt,
    googleReview: opt,
    facebookFollowers: opt,
    tiktokFollowers: opt,
    postingFrequency: opt,
    onlineOrderChannels: opt,
    adsAndLivestream: opt,
  }),
  business: z.strictObject({
    monthlyRevenue: opt,
    dailyOrdersNormal: opt,
    dailyOrdersPeak: opt,
    aov: opt,
    targetCustomers: opt,
    b2bShare: opt,
    customerSources: opt,
    paymentMethods: opt,
    challenges: opt,
    goals12m: opt,
    algExpectations: opt,
    cooperationWishes: opt,
  }),
  production: z.strictObject({
    productLines: z.array(z.string()),
    mainProductLine: opt,
    floristCount: opt,
    leadFloristExperience: opt,
    maxCapacityNormal: opt,
    maxCapacityPeak: opt,
    flowerSupply: opt,
    mainFlowerSource: opt,
    importFrequency: opt,
    rareFlowerAbility: opt,
    inboundProcess: opt,
    freshnessDuration: opt,
    lossRateEstimate: opt,
    nearExpireHandling: opt,
  }),
  facilityAndDelivery: z.strictObject({
    coolers: opt,
    coldStorage: opt,
    premises: opt,
    space: opt,
    equipment: opt,
    staffing: opt,
    deliveryVehicles: opt,
    deliveryRadius: opt,
    deliveryCommitmentTime: opt,
    coldDeliveryAbility: opt,
    deliveryFeePolicy: opt,
  }),
  media: z.strictObject({
    requiredPhotoTypes: opt,
    /** URL ký có hạn tới ảnh trong kho. */
    coverPhotoUrl: opt,
    photoGalleryUrls: z.array(z.string()).optional(),
    rawImageUrls: opt,
    driveImageIds: z.array(z.string()),
    requiredDocuments: opt,
  }),
  scoreAndTier: z.strictObject({
    skillAndCraftScore: opt,
    processFacilityScore: opt,
    supplyStorageScore: opt,
    productionDeliveryScore: opt,
    legalDigitalScore: opt,
    disciplineCooperationScore: opt,
    totalScore: opt,
    suggestedTier: z.string(),
    additionalNotes: opt,
  }),
})
export const marketplaceStoresResponse = data(
  z.strictObject({ stores: z.array(marketplaceStore), total: z.number(), tierCounts: z.record(z.string(), z.number()) })
)
export const marketplaceImportResponse = data(z.strictObject({ added: z.number(), updated: z.number(), total: z.number(), skipped: z.number() }))
export const marketplacePreviewResponse = data(
  z.strictObject({
    headers: z.array(z.string()),
    samples: z.array(z.string()),
    rowCount: z.number(),
    /** Cột tệp ứng với từng cột khảo sát (`null` = không ghép). */
    mapping: z.array(z.number().nullable()),
    source: z.array(z.enum(["header", "position"]).nullable()),
  })
)
export const marketplacePhotosResponse = data(z.strictObject({ stores: z.number(), downloaded: z.number(), failed: z.number(), remaining: z.number() }))
export const deleteStoreResponse = data(z.strictObject({ id: z.string(), shopName: z.string() }))
export const bulkDeleteStoresResponse = data(z.strictObject({ deleted: z.number() }))

const shareLink = z.strictObject({
  id: z.string(),
  label: z.string(),
  expiresAt: timestamp,
  revokedAt: timestamp.nullable(),
  viewCount: z.number(),
  lastViewedAt: timestamp.nullable(),
  createdAt: timestamp,
  status: z.enum(["ACTIVE", "EXPIRED", "REVOKED"]),
})
export const shareLinksResponse = data(z.strictObject({ links: z.array(shareLink) }))
/** `token` chỉ trả lúc tạo (máy chủ chỉ lưu bản băm) — dùng cho `GET /public/marketplace-share/{token}`. */
export const createShareLinkResponse = data(z.strictObject({ link: shareLink, token: z.string() }))
export const revokeShareLinkResponse = data(shareLink)

export const orgsDataResponse = data(
  z.strictObject({
    total: z.number(),
    orgs: z.array(
      z.strictObject({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        type: z.string(),
        industryKey: z.string().nullable(),
        creditBalance: z.number(),
        createdAt: z.string(),
        memberCount: z.number(),
        branchCount: z.number(),
        productCount: z.number(),
        orderCount: z.number(),
        generationJobCount: z.number(),
        spreadsheetCount: z.number(),
        hasBusinessProfile: z.boolean(),
        hasBrandProfile: z.boolean(),
        readinessScore: z.number(),
        lastActivityAt: z.string().nullable(),
      })
    ),
  })
)

export const orgFolderResponse = data(
  z.strictObject({
    orgId: z.string(),
    orgName: z.string(),
    orgSlug: z.string(),
    orgType: z.string(),
    folders: z.array(
      z.strictObject({
        domainKey: z.string(),
        domainNameVi: z.string(),
        descriptionVi: z.string(),
        fieldCount: z.number(),
        fields: z.array(
          z.strictObject({
            fieldKey: z.string(),
            fieldNameVi: z.string(),
            displayValue: z.string(),
            sensitivity: z.string(),
            isPii: z.boolean(),
            source: z.enum(["branches", "catalog", "business_profile", "brand_profile", "settings"]),
          })
        ),
      })
    ),
    totalFieldCount: z.number(),
    stats: z.strictObject({ memberCount: z.number(), branchCount: z.number(), productCount: z.number(), orderCount: z.number(), creditBalance: z.number() }),
  })
)

export const orgRecordsResponse = data(
  z.strictObject({
    domain: z.enum(["branches", "orders", "customers", "catalog", "members", "jobs", "spreadsheets"]),
    columns: z.array(z.strictObject({ key: z.string(), label: z.string(), type: z.enum(["number", "text", "date", "badge", "money", "image"]) })),
    /** Một dòng là bản ghi theo `columns` — giá trị đã định dạng hiển thị. */
    rows: z.array(z.record(z.string(), z.unknown())),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  })
)

export const legalHoldResponse = data(z.strictObject({ legal_hold_until: z.string().nullable() }))
