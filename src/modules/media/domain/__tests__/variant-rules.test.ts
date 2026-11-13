import { describe, expect, it } from "vitest"

import {
  ALL_VARIANT_COMBINATIONS,
  canApproveVariant,
  isEligibleMasterForVariants,
  isVariantPresetId,
  isVariantRatio,
  parseVariantIntegrityBlock,
  variantBatchIdempotencyKey,
  variantIntegrityResult,
  variantRequiresWarning,
  VARIANT_PRESET_IDS,
  VARIANT_RATIOS,
  SUBJECT_IDENTITY_SAFE,
  SUBJECT_IDENTITY_WARNING,
} from "../variant-rules"

describe("M04b — luật thuần của biến thể marketing", () => {
  describe("nguồn hợp lệ", () => {
    it("chỉ nhận Master Image đã duyệt", () => {
      expect(isEligibleMasterForVariants({ kind: "MASTER", approval_state: "APPROVED" })).toBe(true)
    })

    it("từ chối Master còn chờ duyệt — không mở đường vòng qua cổng 2", () => {
      expect(isEligibleMasterForVariants({ kind: "MASTER", approval_state: "PENDING" })).toBe(false)
    })

    it("từ chối ảnh gốc, kể cả khi đã duyệt", () => {
      expect(isEligibleMasterForVariants({ kind: "ORIGINAL", approval_state: "APPROVED" })).toBe(false)
    })

    it("từ chối chính một biến thể đã duyệt — biến thể không đẻ ra biến thể", () => {
      expect(isEligibleMasterForVariants({ kind: "MARKETING", approval_state: "APPROVED" })).toBe(false)
    })
  })

  describe("cổng Subject Integrity", () => {
    it("lõi chủ thể trùng khít tuyệt đối là SAFE", () => {
      expect(variantIntegrityResult(1)).toBe("SAFE")
      expect(variantIntegrityResult(SUBJECT_IDENTITY_SAFE)).toBe("SAFE")
    })

    it("sụt nhẹ dưới ngưỡng an toàn là WARNING, không phải im lặng cho qua", () => {
      expect(variantIntegrityResult(0.995)).toBe("WARNING")
      expect(variantIntegrityResult(SUBJECT_IDENTITY_WARNING)).toBe("WARNING")
    })

    it("sụt sâu là REJECTED — có bước nào đó đã vẽ đè lên sản phẩm", () => {
      expect(variantIntegrityResult(0.9)).toBe("REJECTED")
      expect(variantIntegrityResult(0)).toBe("REJECTED")
    })

    it("số đo không hợp lệ là REJECTED, không phải mặc định cho qua", () => {
      expect(variantIntegrityResult(Number.NaN)).toBe("REJECTED")
      expect(variantIntegrityResult(Number.POSITIVE_INFINITY)).toBe("REJECTED")
    })

    it("REJECTED không vào được luồng duyệt", () => {
      expect(canApproveVariant("REJECTED")).toBe(false)
      expect(canApproveVariant("WARNING")).toBe(true)
      expect(canApproveVariant("SAFE")).toBe(true)
    })

    it("WARNING duyệt được nhưng máy chủ phải nói ra cờ cảnh báo", () => {
      expect(variantRequiresWarning("WARNING")).toBe(true)
      expect(variantRequiresWarning("SAFE")).toBe(false)
    })
  })

  describe("đọc khối đo", () => {
    it("tính lại phán quyết từ số đo, không tin `result` worker gửi kèm", () => {
      const khoi = parseVariantIntegrityBlock({
        subject_pixel_identity: 0.5,
        result: "SAFE", // worker nói dối hoặc worker cũ dùng ngưỡng khác
        source_master_asset_id: "asset-1",
        generative_fill_used: true,
      })
      expect(khoi?.result).toBe("REJECTED")
    })

    it("trả null khi chưa có số đo — job chưa chạy tới bước đo là bình thường", () => {
      expect(parseVariantIntegrityBlock(null)).toBeNull()
      expect(parseVariantIntegrityBlock({})).toBeNull()
      expect(parseVariantIntegrityBlock({ subject_pixel_identity: 1 })).toBeNull()
      expect(parseVariantIntegrityBlock({ source_master_asset_id: "a" })).toBeNull()
    })

    it("lọc `ly_do` về đúng mảng chuỗi", () => {
      const khoi = parseVariantIntegrityBlock({
        subject_pixel_identity: 1,
        source_master_asset_id: "asset-1",
        ly_do: ["ổn", 5, null, "vẫn ổn"],
      })
      expect(khoi?.ly_do).toEqual(["ổn", "vẫn ổn"])
    })

    it("`generative_fill_used` phải khai rõ — thiếu thì coi là false, không đoán", () => {
      const khoi = parseVariantIntegrityBlock({
        subject_pixel_identity: 1,
        source_master_asset_id: "asset-1",
      })
      expect(khoi?.generative_fill_used).toBe(false)
    })
  })

  describe("danh mục preset và tỷ lệ", () => {
    it("nhận đúng sáu bối cảnh đã chốt", () => {
      expect(isVariantPresetId("transparent")).toBe(true)
      expect(isVariantPresetId("luxury_hotel")).toBe(true)
      expect(isVariantPresetId("bối cảnh lạ")).toBe(false)
      expect(isVariantPresetId(7)).toBe(false)
    })

    it("nhận đúng bốn tỷ lệ chuẩn marketing", () => {
      expect(isVariantRatio("9:16")).toBe(true)
      expect(isVariantRatio("3:2")).toBe(false)
    })
  })

  describe("ma trận chạy lô (nợ #108)", () => {
    it("đủ 6 × 4 = 24 tổ hợp, không thiếu không lặp", () => {
      expect(ALL_VARIANT_COMBINATIONS).toHaveLength(VARIANT_PRESET_IDS.length * VARIANT_RATIOS.length)
      const khoa = new Set(ALL_VARIANT_COMBINATIONS.map((c) => `${c.preset}:${c.ratio}`))
      expect(khoa.size).toBe(ALL_VARIANT_COMBINATIONS.length)
    })

    it("mọi preset và mọi ratio đã chốt đều có mặt trong ma trận", () => {
      for (const preset of VARIANT_PRESET_IDS) {
        for (const ratio of VARIANT_RATIOS) {
          expect(
            ALL_VARIANT_COMBINATIONS.some((c) => c.preset === preset && c.ratio === ratio)
          ).toBe(true)
        }
      }
    })

    it("khoá idempotency của từng job trong lô là duy nhất và bắt nguồn từ khoá gốc", () => {
      const khoaGoc = "batch-abc"
      const khoas = ALL_VARIANT_COMBINATIONS.map((c) => variantBatchIdempotencyKey(khoaGoc, c))
      expect(new Set(khoas).size).toBe(khoas.length)
      for (const k of khoas) expect(k.startsWith(`${khoaGoc}:`)).toBe(true)
    })

    it("cùng khoá gốc và cùng tổ hợp luôn ra cùng một khoá — dedupe đúng khi gọi lại", () => {
      const a = variantBatchIdempotencyKey("batch-abc", { preset: "wedding", ratio: "4:5" })
      const b = variantBatchIdempotencyKey("batch-abc", { preset: "wedding", ratio: "4:5" })
      expect(a).toBe(b)
    })
  })
})
