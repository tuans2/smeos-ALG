import { describe, it, expect } from "vitest"
import {
  validateCollectionProfile,
  resolveStoreEffectiveTarget,
  type CollectionRule,
  type DataSharingAgreement,
  type StoreContext,
} from "./chain-collection-profile"
import { type FieldDefinitionV2 } from "./field-registry-v2"
import { STANDARD_G1_CORE_FIELDS } from "./standard-core-fields"

describe("Chain Collection Profile (§9.5.8)", () => {
  const storePriceField = STANDARD_G1_CORE_FIELDS.find(
    (f) => f.fieldKey === "core.catalog.price_vnd"
  )!
  const bankAccountField = STANDARD_G1_CORE_FIELDS.find(
    (f) => f.fieldKey === "core.finance.bank_account_number"
  )!

  const s3SecretField: FieldDefinitionV2 = {
    fieldKey: "core.channel.api_key",
    fieldName: { vi: "Khóa API Kênh", en: "API Key" },
    domain: "channels_integration",
    verticalPack: "core",
    status: "ACTIVE",
    sinceVersion: "2.1.0",
    dataLayer: "L1",
    ownerScope: "STORE",
    dataType: "TEXT",
    sensitivity: "S3_SECRET",
    pii: { isPii: false },
    requiredStage: "OPTIONAL",
    defaultValue: "",
    sourceType: "MANUAL",
    aiAccess: { customerFacing: "DENY", staffFacing: "DENY", analytics: "DENY" },
    aiMayPropose: false,
    propagation: {
      toChain: "NONE",
      toPlatform: "NONE",
      ceiling: { toChain: "NONE", toPlatform: "NONE" },
      chainSelectable: false,
      chainDefault: false,
    },
    exportable: false,
  }

  const allFields = [...STANDARD_G1_CORE_FIELDS, s3SecretField]

  describe("Validation Rules", () => {
    it("P10: Rejects S3 secret fields from collection rules", () => {
      const rules: CollectionRule[] = [
        {
          ruleId: "r-s3",
          fieldKey: "core.channel.api_key",
          minForm: "RAW",
          scope: { type: "ALL_STORES" },
          mandatoryForNewStore: true,
          status: "ACTIVE",
        },
      ]

      const res = validateCollectionProfile(rules, allFields)
      expect(res.isValid).toBe(false)
      expect(res.issues.some((i) => i.code === "S3_NOT_SELECTABLE")).toBe(true)
    })

    it("Demands purpose when collecting S2/PII fields", () => {
      const rulesWithoutPurpose: CollectionRule[] = [
        {
          ruleId: "r-bank",
          fieldKey: "core.finance.bank_account_number",
          minForm: "MASKED",
          scope: { type: "ALL_STORES" },
          mandatoryForNewStore: true,
          status: "ACTIVE",
        },
      ]

      const res1 = validateCollectionProfile(rulesWithoutPurpose, allFields)
      expect(res1.isValid).toBe(false)
      expect(res1.issues.some((i) => i.code === "PURPOSE_REQUIRED_FOR_S2")).toBe(true)

      const rulesWithPurpose: CollectionRule[] = [
        {
          ruleId: "r-bank",
          fieldKey: "core.finance.bank_account_number",
          minForm: "MASKED",
          purpose: "Đối soát và quyết toán thanh toán định kỳ",
          scope: { type: "ALL_STORES" },
          mandatoryForNewStore: true,
          status: "ACTIVE",
        },
      ]

      const res2 = validateCollectionProfile(rulesWithPurpose, allFields)
      expect(res2.isValid).toBe(true)
    })

    it("Rejects floor when it exceeds field inherent ceiling", () => {
      // bank_account_number has ceiling.toChain = MASKED
      const invalidFloorRules: CollectionRule[] = [
        {
          ruleId: "r-bank-raw",
          fieldKey: "core.finance.bank_account_number",
          minForm: "RAW", // Exceeds MASKED ceiling
          purpose: "Kiểm tra",
          scope: { type: "ALL_STORES" },
          mandatoryForNewStore: false,
          status: "ACTIVE",
        },
      ]

      const res = validateCollectionProfile(invalidFloorRules, allFields)
      expect(res.isValid).toBe(false)
      expect(res.issues.some((i) => i.code === "FLOOR_EXCEEDS_CEILING")).toBe(true)
    })

    it("P7: Rejects floor when it violates partner store Data Sharing Agreement (DSA)", () => {
      const partnerDsa: DataSharingAgreement = {
        storeId: "store-partner-01",
        legalEntityId: "partner-entity-xyz",
        fieldCeilings: {
          "core.catalog.price_vnd": "AGGREGATED", // Partner only allows aggregate pricing
        },
        validUntil: "2027-12-31",
        status: "ACTIVE",
      }

      const chainRuleRequiringRawPrice: CollectionRule[] = [
        {
          ruleId: "r-price-raw",
          fieldKey: "core.catalog.price_vnd",
          minForm: "RAW", // Exceeds DSA ceiling AGGREGATED
          scope: { type: "ALL_STORES" },
          mandatoryForNewStore: true,
          status: "ACTIVE",
        },
      ]

      const res = validateCollectionProfile(chainRuleRequiringRawPrice, allFields, [partnerDsa])
      expect(res.isValid).toBe(false)
      expect(res.issues.some((i) => i.code === "DSA_CEILING_VIOLATED")).toBe(true)
    })
  })

  describe("Effective Propagation Resolution (§9.5.8 d)", () => {
    const ownStore: StoreContext = {
      storeId: "store-internal-01",
      isSameLegalEntityAsOwner: true,
    }

    const partnerStore: StoreContext = {
      storeId: "store-partner-01",
      isSameLegalEntityAsOwner: false,
      legalEntityId: "partner-entity-xyz",
    }

    it("P8: Obtains at most maxForm when store shares more (raw)", () => {
      const ruleWithMaxAggregate: CollectionRule = {
        ruleId: "r1",
        fieldKey: "core.catalog.price_vnd",
        minForm: "AGGREGATED",
        maxForm: "AGGREGATED", // Chain only wants aggregated
        scope: { type: "ALL_STORES" },
        mandatoryForNewStore: true,
        status: "ACTIVE",
      }

      const result = resolveStoreEffectiveTarget({
        field: storePriceField,
        store: ownStore,
        matchingRule: ruleWithMaxAggregate,
        storeChoice: "RAW", // Store chooses raw
      })

      expect(result.isAllowed).toBe(true)
      expect(result.effectiveTarget).toBe("AGGREGATED") // Capped by maxForm
    })

    it("Allows store to share up to ceiling if above floor", () => {
      const ruleFloorAggregate: CollectionRule = {
        ruleId: "r2",
        fieldKey: "core.catalog.price_vnd",
        minForm: "AGGREGATED",
        maxForm: "RAW",
        scope: { type: "ALL_STORES" },
        mandatoryForNewStore: true,
        status: "ACTIVE",
      }

      const result = resolveStoreEffectiveTarget({
        field: storePriceField,
        store: ownStore,
        matchingRule: ruleFloorAggregate,
        storeChoice: "RAW",
      })

      expect(result.isAllowed).toBe(true)
      expect(result.effectiveTarget).toBe("RAW")
    })

    it("Enforces DSA ceiling for partner stores", () => {
      const partnerDsa: DataSharingAgreement = {
        storeId: partnerStore.storeId,
        legalEntityId: partnerStore.legalEntityId!,
        fieldCeilings: {
          "core.catalog.price_vnd": "AGGREGATED",
        },
        validUntil: "2027-12-31",
        status: "ACTIVE",
      }

      const rule: CollectionRule = {
        ruleId: "r3",
        fieldKey: "core.catalog.price_vnd",
        minForm: "NONE",
        maxForm: "RAW",
        scope: { type: "ALL_STORES" },
        mandatoryForNewStore: false,
        status: "ACTIVE",
      }

      const result = resolveStoreEffectiveTarget({
        field: storePriceField,
        store: partnerStore,
        matchingRule: rule,
        dsa: partnerDsa,
        storeChoice: "RAW",
      })

      expect(result.isAllowed).toBe(true)
      expect(result.effectiveCeiling).toBe("AGGREGATED")
      expect(result.effectiveTarget).toBe("AGGREGATED")
    })
  })
})
