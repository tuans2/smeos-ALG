import { z } from "zod"

import { data, timestamp } from "./responses-orders"

/**
 * Phản hồi sản phẩm `/api/v1/products/*` (OpenAPI nội bộ, PO 07/11/2026). Sinh từ kiểu TS của use-case
 * (`src/modules/products`, `journey/one-image-kit`) rồi kiểm bằng phản hồi thật ở
 * `tests/tenant/internal-contract-products.test.ts`. Khoá giữ nguyên như mã trả (snake_case của bảng, camelCase
 * của use-case). Thiếu `L5`: `cost_price_vnd` trả `null`, `attributes` bỏ khoá giá (`redacted_fields`).
 */
const STATUS = z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"])

/** Bản ghi `products` (tạo, sửa, duyệt, từ chối, khôi phục). */
export const productRow = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  branch_id: z.string().nullable(),
  code: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  shape: z.string().nullable(),
  facing: z.string().nullable(),
  container: z.string().nullable(),
  status: STATUS,
  attributes: z.unknown(),
  availability_config: z.unknown(),
  barcode: z.string().nullable().optional(),
  cost_price_vnd: z.number().nullable().optional(),
  vat_percent: z.number().nullable().optional(),
  weight_grams: z.number().nullable().optional(),
  tags: z.array(z.string()).optional(),
  created_at: timestamp,
  updated_at: timestamp,
})
export const updatedProductResponse = productRow.extend({ readiness_warnings: z.array(z.string()) })

/** Một dòng tra cứu sản phẩm (danh sách, chi tiết). */
export const productLookup = z.strictObject({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  shape: z.string().nullable(),
  facing: z.string().nullable(),
  container: z.string().nullable(),
  status: z.string(),
  branch_id: z.string().nullable(),
  masterImageUrl: z.string().optional(),
  price_vnd: z.number().nullable(),
  driveLink: z.string().optional(),
  pricing: z
    .strictObject({
      partner_tier_bonus: z.record(z.string(), z.number()),
      surcharge_groups: z.array(z.unknown()),
      optimal_price_ratio: z.number(),
      floor_ceiling_ratio: z.strictObject({ floorRatio: z.number(), ceilingRatio: z.number() }),
    })
    .nullable(),
  redacted_fields: z.array(z.string()),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  availability_config: z.unknown().optional(),
  commerce: z.strictObject({
    barcode: z.string().nullable(),
    cost_price_vnd: z.number().nullable(),
    vat_percent: z.number().nullable(),
    weight_grams: z.number().nullable(),
    tags: z.array(z.string()),
  }),
})
/** Lọc thường: `{ data, next_cursor }`; lọc toàn kho (`occasion`/`price_range`/`sort`) thêm `total`, `truncated`. */
export const productsResponse = z.strictObject({
  data: z.array(productLookup),
  next_cursor: z.string().nullable(),
  total: z.number().optional(),
  truncated: z.boolean().optional(),
})

const masterIndex = z.strictObject({
  id: z.string(),
  organizationId: z.string(),
  code: z.string(),
  name: z.string(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]),
  hasApprovedCopy: z.boolean().optional(),
  category: z.string(),
  shape: z.string(),
  facing: z.string(),
  container: z.string().optional(),
  style: z.string(),
  occasions: z.array(z.string()),
  masterImageUrl: z.string().optional(),
  colorPalette: z.strictObject({ primaryColor: z.string(), secondaryColor: z.string().optional() }),
  bom: z.strictObject({
    flowers: z.array(z.strictObject({
      flowerName: z.string(),
      quantity: z.number(),
      unit: z.enum(["bông", "cành", "lá", "cây"]),
      color: z.string(),
      role: z.enum(["Chủ đạo", "Phụ", "Điểm xuyến", "Lấp đầy"]),
      shade: z.string().optional(),
      budCount: z.number().optional(),
      damagedCount: z.number().optional(),
      variety: z.string().optional(),
      stemLengthCm: z.number().optional(),
      substitutionAllowed: z.boolean().optional(),
      substitutionPriority: z.number().optional(),
    })),
    foliage: z.array(z.strictObject({
      name: z.string(),
      quantity: z.number().nullable(),
      unit: z.enum(["bông", "cành", "lá", "cây"]),
      color: z.string(),
      role: z.enum(["Lấp đầy", "Nền", "Viền", "Điểm nhấn"]),
      substitutionAllowed: z.boolean().optional(),
    })),
    wrapping: z.array(z.strictObject({
      layer: z.string(),
      material: z.string(),
      color: z.string(),
      texture: z.string(),
      pattern: z.string().optional(),
      quantity: z.number().optional(),
      substitutionAllowed: z.boolean().optional(),
    })),
    wrapStyle: z.string(),
    ribbon: z.string(),
    accessories: z.array(z.strictObject({
      name: z.string(),
      material: z.string(),
      color: z.string(),
      quantity: z.number().nullable(),
      printedText: z.string().nullable(),
      unit: z.string().optional(),
      substitutionAllowed: z.boolean().optional(),
    })),
    tierCount: z.number().optional(),
  }),
  pricing: z.strictObject({ costPriceVnd: z.number().optional(), quotePriceVnd: z.number().nullable() }),
  variants: z.array(z.strictObject({ id: z.string(), name: z.string(), size: z.string().optional(), multiplier: z.number() })),
  stock: z.strictObject({
    status: z.enum(["IN_STOCK", "PRE_ORDER_ONLY", "OUT_OF_STOCK"]),
    quantityAvailable: z.number().optional(),
  }).optional(),
  galleryImages: z.array(z.strictObject({ role: z.enum(["GALLERY", "CATALOG", "SOCIAL", "REFERENCE"]), url: z.string() })),
  freshnessGuaranteeDays: z.number().optional(),
  warningTags: z.array(z.string()),
  dimensions: z.strictObject({ heightCm: z.number(), widthCm: z.number() }).optional(),
  substitutionPolicy: z.strictObject({ allowed: z.boolean(), note: z.string().optional() }).optional(),
  updatedAt: z.string(),
})
export const masterIndexItemResponse = z.strictObject({ item: masterIndex })
export const masterIndexListResponse = z.strictObject({ items: z.array(masterIndex), count: z.number() })

export const changeRequestsResponse = data(
  z.array(
    z.strictObject({
      id: z.string(),
      productId: z.string(),
      productName: z.string(),
      productCode: z.string(),
      proposedBy: z.string(),
      changes: z.unknown(),
      fields: z.array(z.strictObject({ key: z.string(), label: z.string() })),
      status: z.string(),
      note: z.string().nullable(),
      createdAt: timestamp,
      expiresAt: timestamp,
    })
  )
)
export const changeRequestRow = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  status: z.string(),
  created_at: timestamp,
  updated_at: timestamp,
  product_id: z.string(),
  proposed_by: z.string(),
  changes: z.unknown(),
  base_updated_at: timestamp,
  applied_fields: z.unknown(),
  reviewed_by: z.string().nullable(),
  reviewed_at: timestamp.nullable(),
  note: z.string().nullable(),
  expires_at: timestamp,
})
export const revisionsResponse = data(z.array(z.strictObject({ id: z.string(), reason: z.string(), actorId: z.string(), createdAt: timestamp, snapshot: z.unknown() })))
export const bulkStatusResponse = z.strictObject({
  updated: z.array(z.string()),
  failed: z.array(z.strictObject({ id: z.string(), reason: z.string() })),
  warnings: z.array(z.strictObject({ id: z.string(), code: z.string(), missing: z.array(z.string()) })),
})
export const importBatchesResponse = data(
  z.array(
    z.strictObject({ id: z.string(), createdAt: timestamp, createdCount: z.number(), updatedCount: z.number(), undoneAt: timestamp.nullable(), canUndo: z.boolean() })
  )
)
export const undoImportBatchResponse = z.strictObject({ trashed: z.number(), restored: z.number(), failedCount: z.number() })
export const batchImportResponse = z.strictObject({ data: z.strictObject({
  batch_id: z.string(),
  total_requested: z.number(),
  created_count: z.number(),
  updated_count: z.number(),
  skipped_count: z.number(),
  images_attached_count: z.number(),
  drive_links_updated_count: z.number(),
  failed_count: z.number(),
  created: z.array(z.strictObject({ id: z.string(), code: z.string(), name: z.string() })),
  updated: z.array(z.string()),
  skipped: z.array(z.string()),
  failed: z.array(z.strictObject({ code: z.string(), error: z.string() })),
}) })
export const driveThumbnailsResponse = z.strictObject({ thumbnails: z.record(z.string(), z.string().nullable()) })

const JOB_STATUS = z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"])
export const oneImageKitStartResponse = data(
  z.strictObject({
    jobId: z.string(),
    status: z.string(),
    engine: z.enum(["openai_structured", "openai_direct", "local_cv"]),
    usage: z.strictObject({ costCredit: z.number(), balanceAfter: z.number().nullable() }),
  })
)
export const oneImageKitProgressResponse = data(
  z.strictObject({
    jobStatus: JOB_STATUS,
    analysis: z
      .strictObject({
        id: z.string(),
        approvalState: z.enum(["PENDING", "APPROVED", "REJECTED"]),
        imageUrl: z.string().nullable(),
        category: z.string().nullable(),
        flowers: z.array(z.strictObject({ name: z.string(), quantity: z.number(), unit: z.string().nullable(), role: z.string().nullable() })),
      })
      .nullable(),
  })
)
export const oneImageKitRunResponse = data(
  z.strictObject({
    status: z.enum(["READY", "FAILED"]),
    outputs: z.strictObject({
      productId: z.string().nullable(),
      copyId: z.string().nullable(),
      cost: z.strictObject({ totalVnd: z.number(), complete: z.boolean(), missingPrices: z.array(z.string()), unmatched: z.array(z.string()) }).nullable(),
      contentGenerationId: z.string().nullable(),
      posts: z.array(z.strictObject({ channel: z.string(), text: z.string(), hashtags: z.array(z.string()), needsReview: z.boolean() })),
      printRenditionId: z.string().nullable(),
    }),
    /** Bước hỏng (`status = FAILED`): PRODUCT · COPY · COST · POSTS · CARD; credit của bước đó đã hoàn. */
    failedStep: z.enum(["PRODUCT", "COPY", "COST", "POSTS", "CARD"]).nullable(),
    error: z.string().nullable(),
  })
)
