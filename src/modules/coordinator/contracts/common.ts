/**
 * Common types and schemas for Coordinator Module Contracts.
 * Tuân thủ Atomic Disaggregated Fields & Master Index SSOT của ALG.
 */

import { z } from "zod"

export const DemUnitSchema = z.enum(["bông", "cành", "lá", "cây"])

export const FlowerRoleSchema = z.enum(["Chủ đạo", "Phụ", "Điểm xuyến", "Lấp đầy"])

export const FoliageRoleSchema = z.enum(["Nền", "Viền", "Điểm nhấn", "Lấp đầy"])

/** Thành phần cành hoa nguyên tử từ Product Master Index */
export const AtomicFlowerBomItemSchema = z.object({
  flowerName: z.string().min(1),
  quantity: z.number().int().positive(),
  unit: DemUnitSchema,
  color: z.string().min(1),
  role: FlowerRoleSchema,
  shade: z.string().optional(),
  budCount: z.number().int().nonnegative().optional(),
  damagedCount: z.number().int().nonnegative().optional(),
  /** MI-12 (ĐP-2b, 26/09/2026) — giữ khớp `FlowerBomItem` của Product Master Index. */
  variety: z.string().optional(),
  stemLengthCm: z.number().positive().optional(),
  substitutionAllowed: z.boolean().optional(),
  substitutionPriority: z.number().int().positive().optional(),
})

export const AtomicFoliageBomItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive().nullable(),
  unit: DemUnitSchema,
  color: z.string().min(1),
  role: FoliageRoleSchema,
  /** MI-12 (ĐP-2b, 26/09/2026) — giữ khớp `FoliageBomItem` của Product Master Index. */
  substitutionAllowed: z.boolean().optional(),
})

export const AtomicWrappingLayerSchema = z.object({
  layer: z.string().min(1),
  material: z.string().min(1),
  color: z.string().min(1),
  texture: z.string().min(1),
  /** MI-12 (ĐP-2b, 26/09/2026) — giữ khớp `WrappingLayer` của Product Master Index. */
  pattern: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  substitutionAllowed: z.boolean().optional(),
})

export const AtomicAccessoryBomItemSchema = z.object({
  name: z.string().min(1),
  material: z.string().min(1),
  color: z.string().min(1),
  quantity: z.number().int().positive().nullable(),
  printedText: z.string().nullable(),
  /** MI-12 (ĐP-2b, 26/09/2026) — giữ khớp `AccessoryBomItem` của Product Master Index. */
  unit: z.string().optional(),
  substitutionAllowed: z.boolean().optional(),
})

export const CoordinatorStageEnum = z.enum([
  "INTAKE",
  "VALIDATING",
  "PLANNING",
  "ASSIGNING",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "DISPATCHING",
  "DELIVERED",
  "COMPLETED",
  "EXCEPTION",
  "CANCELLED",
])

export const CoordinationRiskLevelEnum = z.enum([
  "NORMAL",
  "ATTENTION",
  "AT_RISK",
  "CRITICAL",
])

export const CustomerTierEnum = z.enum([
  "NEW",
  "BRONZE",
  "SILVER",
  "GOLD",
  "VIP",
])

/**
 * Chuẩn Địa Chỉ Phân Cấp Nguyên Tử (Atomic Structured Address SSOT)
 * Phân cấp 5 tầng: Số nhà, ngõ/tên đường + Phường/Xã + Quận/Huyện + Tỉnh/Thành phố + Quốc gia
 */
export const StructuredAddressSchema = z.object({
  /** Số nhà, ngõ/ngách/hẻm, tên đường, số phòng, toà nhà */
  street: z.string().min(1, "Số nhà, ngõ, tên đường là bắt buộc"),
  /** Phường, Xã, Thị trấn */
  ward: z.string().min(1, "Phường/Xã là bắt buộc"),
  /** Quận, Huyện, Thị xã, Thành phố trực thuộc tỉnh */
  district: z.string().min(1, "Quận/Huyện là bắt buộc"),
  /** Tỉnh, Thành phố trực thuộc trung ương */
  city: z.string().min(1, "Tỉnh/Thành phố là bắt buộc"),
  /** Quốc gia (mặc định Việt Nam) */
  country: z.string().default("Việt Nam"),
  /** Địa chỉ hoàn chỉnh ghép chuẩn */
  formattedAddress: z.string().optional(),
})

export type StructuredAddress = z.infer<typeof StructuredAddressSchema>
