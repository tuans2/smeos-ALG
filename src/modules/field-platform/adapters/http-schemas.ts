import { camelKeys, type CamelKeys } from "@/lib/case-keys"
import { z } from "zod"
import { validationFailed } from "@/core/http/errors"
import { CUSTOM_FIELD_DATA_TYPES, type CustomFieldDataType } from "../domain/custom-field-schema"

/** Thân HTTP snake_case (PO D-69) → camelCase cho use-case, đổi đúng một lần ở đây. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<CamelKeys<z.infer<S>>> {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return camelKeys(parsed.data as object) as CamelKeys<z.infer<S>>
}

const visibilitySchema = z
  .object({ INTERNAL: z.boolean(), PARTNER: z.boolean(), SHIPPER: z.boolean(), CUSTOMER: z.boolean() })
  .partial()

const requirementSchema = z.enum(["OPTIONAL", "RECOMMENDED", "REQUIRED"])

export const updateFieldConfigSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  placeholder: z.string().trim().max(200).nullable().optional(),
  requirement: requirementSchema.optional(),
  visibility: visibilitySchema.optional(),
  catalog_key: z.string().trim().max(100).nullable().optional(),
  default_enabled: z.boolean().optional(),
})

export const createCustomFieldSchema = z.object({
  entity: z.enum(["ORDER", "PARTNER"]),
  label: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  placeholder: z.string().trim().max(200).optional(),
  data_type: z.enum(CUSTOM_FIELD_DATA_TYPES as [CustomFieldDataType, ...CustomFieldDataType[]]),
  requirement: requirementSchema.optional(),
  required_at_stage: z.string().trim().max(60).optional(),
  visibility: visibilitySchema.optional(),
  catalog_key: z.string().trim().max(100).optional(),
  sensitivity: z.enum(["NORMAL", "PII", "SENSITIVE"]).optional(),
  default_enabled: z.boolean().optional(),
})

export const upsertCatalogValueSchema = z.object({
  code: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  sort_order: z.number().int().min(0).optional(),
  behavior: z.string().trim().max(100).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
})

export const setFieldOverrideSchema = z.object({
  field_key: z.string().trim().min(1),
  label: z.string().trim().max(200).optional(),
  visibility: visibilitySchema.optional(),
  requirement: requirementSchema.optional(),
  is_enabled: z.boolean().optional(),
})

export const setCatalogValueOverrideSchema = z.object({
  catalog_key: z.string().trim().min(1),
  code: z.string().trim().min(1),
  label: z.string().trim().max(200).optional(),
  is_enabled: z.boolean().optional(),
})

/** Cửa hàng tự tạo trường riêng (checklist ALG 1.9, `D18`). */
export const createShopFieldSchema = z.object({
  entity: z.enum(["ORDER", "PARTNER"]),
  label: z.string().trim().min(1).max(120),
  data_type: z.enum(CUSTOM_FIELD_DATA_TYPES as [CustomFieldDataType, ...CustomFieldDataType[]]),
  requirement: requirementSchema.optional(),
  visibility: visibilitySchema.optional(),
  placeholder: z.string().trim().max(200).optional(),
})

/** Cửa hàng ẩn/hiện, đổi nhãn, nâng mức một trường (`D18`). */
export const updateShopFieldSchema = z.object({
  key: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120).optional(),
  is_enabled: z.boolean().optional(),
  requirement: requirementSchema.optional(),
  visibility: visibilitySchema.optional(),
})
