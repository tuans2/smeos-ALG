/**
 * ALG Inputs Architecture v2.1 — Field Registry v2 Linter
 *
 * Enforces the 11 CI linting rules specified in §7.2 of the Architecture doc.
 * Fails fast before build or merge.
 */

import { type FieldDefinitionV2 } from "./field-registry-v2"
import { isValidInputDomainKey } from "./input-domains"

export interface LintError {
  readonly fieldKey: string
  readonly ruleId: string
  readonly message: string
}

export function lintFieldDefinitionV2(field: FieldDefinitionV2): LintError[] {
  const errors: LintError[] = []

  // Rule 1: field_key naming convention (<namespace>.<domain>.<name>)
  const keyParts = field.fieldKey.split(".")
  if (keyParts.length < 3 || keyParts.some((p) => !/^[a-z0-9_-]+$/i.test(p))) {
    errors.push({
      fieldKey: field.fieldKey,
      ruleId: "LINT-01",
      message: `fieldKey '${field.fieldKey}' phải tuân theo định dạng namespace (vd. 'core.catalog.price' hoặc 'tenant.<id>.x')`,
    })
  }

  // Validate domain key
  if (!isValidInputDomainKey(field.domain)) {
    errors.push({
      fieldKey: field.fieldKey,
      ruleId: "LINT-DOMAIN",
      message: `domain '${field.domain}' không thuộc 16 domain chuẩn`,
    })
  }

  // Rule 2: S3 Secret fields MUST have ai_access = DENY for all audiences
  if (field.sensitivity === "S3_SECRET") {
    if (
      field.aiAccess.customerFacing !== "DENY" ||
      field.aiAccess.staffFacing !== "DENY" ||
      field.aiAccess.analytics !== "DENY"
    ) {
      errors.push({
        fieldKey: field.fieldKey,
        ruleId: "LINT-02",
        message: "Trường S3_SECRET bắt buộc ai_access = DENY ở cả 3 đối tượng (customer, staff, analytics)",
      })
    }
  }

  // Rule 3: S2 or PII fields MUST have purpose, legalBasis, retentionDays; customerFacing != READ
  if (field.sensitivity === "S2_CONFIDENTIAL" || field.pii.isPii) {
    if (!field.pii.purpose || !field.pii.legalBasis || field.pii.retentionDays === undefined) {
      errors.push({
        fieldKey: field.fieldKey,
        ruleId: "LINT-03",
        message: "Trường S2 hoặc PII bắt buộc khai báo purpose, legalBasis và retentionDays",
      })
    }
    if (field.aiAccess.customerFacing === "READ") {
      errors.push({
        fieldKey: field.fieldKey,
        ruleId: "LINT-03-AI",
        message: "Trường S2 hoặc PII không được cấp quyền READ trực tiếp cho khách (chỉ DENY hoặc READ_MASKED)",
      })
    }
  }

  // Rule 4: S1 Internal fields default customerFacing = DENY
  if (field.sensitivity === "S1_INTERNAL" && field.aiAccess.customerFacing === "READ") {
    errors.push({
      fieldKey: field.fieldKey,
      ruleId: "LINT-04",
      message: "Trường S1_INTERNAL không được cấp quyền READ cho khách đối ngoại",
    })
  }

  // Rule 5: L5/L6 cannot have sourceType = MANUAL
  if ((field.dataLayer === "L5" || field.dataLayer === "L6") && field.sourceType === "MANUAL") {
    errors.push({
      fieldKey: field.fieldKey,
      ruleId: "LINT-05",
      message: "Dữ liệu tầng L5 (Transactional) và L6 (Derived) không được có sourceType = MANUAL",
    })
  }

  // Rule 7: DEPRECATED field must have removeIn and replacementField
  if (field.status === "DEPRECATED") {
    if (!field.removeIn || !field.replacementField) {
      errors.push({
        fieldKey: field.fieldKey,
        ruleId: "LINT-07",
        message: "Trường DEPRECATED phải có removeIn và replacementField thay thế",
      })
    }
  }

  // Rule 8: requiredStage = G1 must have validation or defaultValue
  if (field.requiredStage === "G1") {
    if (field.defaultValue === undefined && !field.validation) {
      errors.push({
        fieldKey: field.fieldKey,
        ruleId: "LINT-08",
        message: "Trường bắt buộc ở giai đoạn G1 phải có defaultValue hoặc validation rule",
      })
    }
  }

  // Rule 9: S3 field propagation must be NONE
  if (field.sensitivity === "S3_SECRET") {
    if (
      field.propagation.toChain !== "NONE" ||
      field.propagation.toPlatform !== "NONE" ||
      field.propagation.ceiling.toChain !== "NONE" ||
      field.propagation.ceiling.toPlatform !== "NONE"
    ) {
      errors.push({
        fieldKey: field.fieldKey,
        ruleId: "LINT-09",
        message: "Trường S3_SECRET bắt buộc propagation = NONE cho cả toChain và toPlatform",
      })
    }
    if (field.propagation.chainSelectable) {
      errors.push({
        fieldKey: field.fieldKey,
        ruleId: "LINT-11",
        message: "Trường S3_SECRET bắt buộc chainSelectable = false",
      })
    }
  }

  // Rule 9b: S2/PII to_platform cannot be RAW
  if ((field.sensitivity === "S2_CONFIDENTIAL" || field.pii.isPii) && field.propagation.toPlatform === "RAW") {
    errors.push({
      fieldKey: field.fieldKey,
      ruleId: "LINT-09-RAW",
      message: "Trường S2 hoặc PII không được phép truyền RAW lên nền tảng Platform",
    })
  }

  return errors
}

export function lintRegistryV2(fields: readonly FieldDefinitionV2[]): LintError[] {
  const allErrors: LintError[] = []
  const keys = new Set<string>()

  for (const field of fields) {
    if (keys.has(field.fieldKey)) {
      allErrors.push({
        fieldKey: field.fieldKey,
        ruleId: "LINT-DUPLICATE-KEY",
        message: `Trùng lặp khóa trường fieldKey: '${field.fieldKey}'`,
      })
    }
    keys.add(field.fieldKey)

    const errors = lintFieldDefinitionV2(field)
    allErrors.push(...errors)
  }

  return allErrors
}
