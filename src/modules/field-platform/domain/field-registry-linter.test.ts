import { describe, expect, it } from "vitest"
import { type FieldDefinitionV2 } from "./field-registry-v2"
import { lintFieldDefinitionV2, lintRegistryV2 } from "./field-registry-linter"

describe("Field Registry v2 Linter", () => {
  const validBaseField: FieldDefinitionV2 = {
    fieldKey: "core.supply.unit_cost",
    fieldName: { vi: "Giá nhập", en: "Purchase cost" },
    domain: "supply_inventory",
    verticalPack: "core",
    status: "ACTIVE",
    sinceVersion: "2.0.0",
    dataLayer: "L3",
    ownerScope: "STORE",
    dataType: "MONEY_VND",
    currency: "VND",
    sensitivity: "S1_INTERNAL",
    pii: { isPii: false },
    requiredStage: "G2",
    sourceType: "MANUAL",
    aiAccess: {
      customerFacing: "DENY",
      staffFacing: "READ",
      analytics: "READ",
    },
    aiMayPropose: false,
    propagation: {
      toChain: "MASKED",
      toPlatform: "AGGREGATED",
      ceiling: { toChain: "RAW", toPlatform: "AGGREGATED" },
      chainSelectable: true,
      chainDefault: false,
    },
    exportable: true,
  }

  it("passes linting for valid standard field", () => {
    const errors = lintFieldDefinitionV2(validBaseField)
    expect(errors).toHaveLength(0)
  })

  it("fails if fieldKey does not follow namespace conventions", () => {
    const invalid = { ...validBaseField, fieldKey: "invalidKey" }
    const errors = lintFieldDefinitionV2(invalid)
    expect(errors.some((e) => e.ruleId === "LINT-01")).toBe(true)
  })

  it("enforces rule 2: S3_SECRET must deny AI access to all audiences", () => {
    const s3Invalid: FieldDefinitionV2 = {
      ...validBaseField,
      fieldKey: "core.channel.api_key",
      sensitivity: "S3_SECRET",
      aiAccess: {
        customerFacing: "DENY",
        staffFacing: "READ", // INVALID
        analytics: "DENY",
      },
      propagation: {
        toChain: "NONE",
        toPlatform: "NONE",
        ceiling: { toChain: "NONE", toPlatform: "NONE" },
        chainSelectable: false,
        chainDefault: false,
      },
    }
    const errors = lintFieldDefinitionV2(s3Invalid)
    expect(errors.some((e) => e.ruleId === "LINT-02")).toBe(true)
  })

  it("enforces rule 3: PII fields must declare purpose, legal basis, and retention", () => {
    const piiInvalid: FieldDefinitionV2 = {
      ...validBaseField,
      fieldKey: "core.customer.phone",
      sensitivity: "S2_CONFIDENTIAL",
      pii: {
        isPii: true,
        // missing purpose, legalBasis, retentionDays
      },
    }
    const errors = lintFieldDefinitionV2(piiInvalid)
    expect(errors.some((e) => e.ruleId === "LINT-03")).toBe(true)
  })

  it("enforces rule 5: L5/L6 data cannot be manual", () => {
    const l5Invalid: FieldDefinitionV2 = {
      ...validBaseField,
      fieldKey: "core.order.total",
      dataLayer: "L5",
      sourceType: "MANUAL",
    }
    const errors = lintFieldDefinitionV2(l5Invalid)
    expect(errors.some((e) => e.ruleId === "LINT-05")).toBe(true)
  })

  it("enforces rule 8: G1 required stage requires validation or defaultValue", () => {
    const g1Invalid: FieldDefinitionV2 = {
      ...validBaseField,
      fieldKey: "core.catalog.product_name",
      requiredStage: "G1",
      defaultValue: undefined,
      validation: undefined,
    }
    const errors = lintFieldDefinitionV2(g1Invalid)
    expect(errors.some((e) => e.ruleId === "LINT-08")).toBe(true)
  })

  it("detects duplicate keys in registry", () => {
    const errors = lintRegistryV2([validBaseField, validBaseField])
    expect(errors.some((e) => e.ruleId === "LINT-DUPLICATE-KEY")).toBe(true)
  })
})
