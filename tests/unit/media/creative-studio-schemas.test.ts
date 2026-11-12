import { describe, it, expect } from "vitest"
import {
  validateCreativeStudioInput,
  validateCreativeStudioOutput,
  type CreativeStudioJobInput,
  type CreativeStudioJobOutput,
} from "@/modules/media/domain/creative-studio-schemas"

describe("CreativeStudio Schemas Validation", () => {
  const validJobInput: CreativeStudioJobInput = {
    jobId: "c6a1e809-54d9-4d92-9477-94e43b174092",
    organizationId: "org-flora-test-01",
    taskType: "GENERATE_SCENE_VARIANT",
    sourceImage: {
      assetId: "asset-flower-001",
      imageUrl: "https://storage.avilotusgroup.com/org/test/flower-master.jpg",
      dimensions: { width: 1024, height: 1024 },
    },
    productPassport: {
      primaryFlowers: [
        { name: "Hoa hồng đỏ Ohara", quantity: 15, color: "Đỏ tươi", role: "chinh" },
        { name: "Hoa baby trắng", quantity: 5, color: "Trắng", role: "phu" },
      ],
      foliage: [{ name: "Lá bạc Eucalyptus", color: "Xanh bạc" }],
      packaging: {
        wrapMaterial: "Giấy lụa mờ Hàn Quốc",
        wrapColor: "Đen tuyền",
        ribbonColor: "Đỏ rượu vang",
      },
      styleOccasion: {
        form: "bo_tron",
        tone: "luxury",
        intendedOccasion: "Sinh nhật cao cấp",
      },
    },
    sceneConfig: {
      presetId: "luxury_warm",
      lightingStyle: "warm_golden_hour",
      surfaceTexture: "marble_white",
    },
    executionParams: {
      targetRatios: ["1:1", "4:5", "9:16"],
      qualityTier: "hd_master_2k",
      subjectProtectionStrictness: 0.99,
      watermark: { enabled: true, position: "bottom_right" },
    },
  }

  it("chấp nhận input hợp lệ đầy đủ các trường nguyên tử từ M01", () => {
    const result = validateCreativeStudioInput(validJobInput)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("từ chối input thiếu jobId hoặc organizationId", () => {
    const invalidInput = { ...validJobInput, jobId: "", organizationId: "" }
    const result = validateCreativeStudioInput(invalidInput)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.includes("jobId"))).toBe(true)
    expect(result.errors.some((e) => e.includes("organizationId"))).toBe(true)
  })

  it("từ chối input không có danh sách hoa primaryFlowers từ M01", () => {
    const invalidInput = {
      ...validJobInput,
      productPassport: { primaryFlowers: [] },
    }
    const result = validateCreativeStudioInput(invalidInput)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.includes("primaryFlowers"))).toBe(true)
  })

  it("chấp nhận output COMPLETED có đầy đủ chứng chỉ kiểm định toàn vẹn", () => {
    const validOutput: CreativeStudioJobOutput = {
      jobId: validJobInput.jobId,
      status: "COMPLETED",
      providerInfo: {
        providerName: "photoroom",
        modelVersion: "photoroom-ecom-v2",
        latencyMs: 1450,
      },
      generatedAssets: [
        {
          ratio: "1:1",
          storageKey: "org/test/variants/variant-1-1.jpg",
          url: "https://storage.avilotusgroup.com/org/test/variants/variant-1-1.jpg",
          width: 2048,
          height: 2048,
          format: "jpeg",
          hasWatermark: true,
        },
      ],
      integrityAudit: {
        subjectPixelIdentity: 0.998,
        verdict: "SAFE",
        metrics: {
          colorConsistencyScore: 0.99,
          geometryPreservationScore: 0.995,
          componentBomMatch: true,
        },
      },
      usageMetrics: {
        costUsd: 0.05,
        creditsDeducted: 10,
        gpuInferenceSeconds: 1.45,
      },
    }

    const result = validateCreativeStudioOutput(validOutput)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("từ chối output COMPLETED nhưng thiếu chứng chỉ đo toàn vẹn integrityAudit", () => {
    const invalidOutput = {
      jobId: validJobInput.jobId,
      status: "COMPLETED",
      providerInfo: { providerName: "photoroom", modelVersion: "v1", latencyMs: 1000 },
      generatedAssets: [{ ratio: "1:1", storageKey: "k", url: "u", width: 100, height: 100, format: "png", hasWatermark: false }],
    }
    const result = validateCreativeStudioOutput(invalidOutput)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.includes("integrityAudit"))).toBe(true)
  })
})
