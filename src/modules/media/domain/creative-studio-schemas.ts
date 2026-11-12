/**
 * Creative Studio Schemas — Chuẩn hóa dữ liệu Input và Output đạt chuẩn Commercial Ready.
 *
 * Mọi giao tiếp giữa ALG Core và các AI Provider ngoài (Photoroom, Google Imagen 3,
 * Fal.ai FLUX Fill, Studio Pipeline) bắt buộc phải qua hình dạng này.
 *
 * Tệp thuần Domain: không import Prisma, không gọi I/O, không phụ thuộc hạ tầng mạng.
 */

// ============================================================
// 1. INPUT DOMAIN TYPES
// ============================================================

export type CreativeStudioTaskType =
  | "OPTIMIZE_MASTER"         // M04a: Làm nét, khử nhiễu, cân bằng sáng tạo Master Image
  | "GENERATE_SCENE_VARIANT"   // M04b: Ghép bối cảnh Studio/Lifestyle đa tỉ lệ
  | "RETOUCH_DETAIL"          // AIC-15: Sửa khuyết điểm nhỏ (lá úa, nếp nhăn giấy gói)

// Phân định rạch ròi 2 Cơ chế Xử lý (Zero inter-dependency):
// 1. local_studio: Thuật toán đồ họa cục bộ, offline trên Python worker (0đ, 0 token)
// 2. cloud_provider: Trí tuệ nhân tạo đám mây (Photoroom, Fal Flux, Google Imagen)
export type ProcessingEngineType = "local_studio" | "cloud_provider"

export interface LocalStudioEngineConfig {
  readonly engine: "local_studio"
  readonly studioStyle?: "warm_gray" | "lifestyle_clean" | "boutique_bokeh" | string
  readonly mode?: "auto" | "custom"
  readonly selectedCapabilities?: readonly string[]
  readonly preset?: string
  readonly ratio?: string
  readonly watermark?: boolean
}

export interface CloudProviderEngineConfig {
  readonly engine: "cloud_provider"
  readonly providerKey: "photoroom" | "imagen" | "fal" | "router"
  readonly cameraAngle?: CameraAngleType
  readonly humanInteraction?: HumanInteractionType
  readonly storySequenceId?: string
  readonly customDirectives?: readonly string[]
}

export interface PrimaryFlowerPassport {
  readonly name: string
  readonly quantity: number
  readonly color: string
  readonly role: "chinh" | "phu" | "diem"
}

export interface FoliagePassport {
  readonly name: string
  readonly quantity?: number
  readonly color?: string
  readonly role?: string
}

export interface PackagingPassport {
  readonly wrapMaterial?: string
  readonly wrapColor?: string
  readonly ribbonColor?: string
  readonly accessories?: readonly string[]
}

export interface StyleOccasionPassport {
  readonly form?: "bo_tron" | "bo_dai" | "gio_hoa" | "lang_hoa" | "hop_hoa" | "binh_hoa" | string
  readonly tone?: "pastel" | "luxury" | "ruc_ro" | "vintage" | "minimal" | string
  readonly intendedOccasion?: string
}

export interface GenericComponentPassport {
  readonly name: string
  readonly quantity?: number
  readonly unit?: string
  readonly color?: string
  readonly role?: string
}

export interface ProductPassportInput {
  readonly productName?: string
  readonly category?: string
  readonly industryKey?: string
  readonly primaryFlowers: readonly PrimaryFlowerPassport[]
  readonly genericComponents?: readonly GenericComponentPassport[]
  readonly foliage?: readonly FoliagePassport[]
  readonly packaging?: PackagingPassport
  readonly colorPalette?: readonly string[]
  readonly styleOccasion?: StyleOccasionPassport
}

export interface SourceImageInput {
  readonly assetId: string
  readonly imageUrl: string
  readonly maskUrl?: string
  readonly dimensions?: {
    readonly width: number
    readonly height: number
  }
}

export interface SceneConfigInput {
  readonly presetId: string
  readonly environmentDescription?: string
  readonly lightingStyle?: "soft_studio" | "warm_golden_hour" | "natural_window" | "dramatic_luxury"
  readonly surfaceTexture?: "marble_white" | "oak_wood" | "linen_fabric" | "concrete_matte" | "glass_reflective"
}

export interface ExecutionParamsInput {
  readonly targetRatios: readonly ("1:1" | "4:5" | "9:16" | "16:9")[]
  readonly qualityTier: "standard" | "hd_master_2k" | "ultra_4k"
  readonly subjectProtectionStrictness: number // Ngưỡng toàn vẹn 0.95 - 1.0 (mặc định 0.99)
  readonly watermark?: {
    readonly enabled: boolean
    readonly logoAssetId?: string
    readonly position?: "bottom_right" | "bottom_left" | "center_subtle"
  }
}

export type CameraAngleType =
  | "front_view"         // Trực diện 0° ngang tầm mắt
  | "three_quarter_45"   // Góc nghiêng 45° ba phần tư tôn chiều sâu
  | "flat_lay_topdown"   // Góc phẳng từ trên xuống 90° (Editorial Flat-lay)
  | "macro_closeup"      // Cận cảnh chi tiết cánh hoa & thớ ruy băng

export type HumanInteractionType =
  | "none"                 // Không có người (chỉ chụp hoa)
  | "female_holding"       // Mẫu nữ thanh lịch ôm sản phẩm ngang ngực
  | "male_holding"         // Mẫu nam lịch lãm veston/sơ mi cầm hoa
  | "florist_artisan_hands" // Bàn tay thợ chế tác thắt nơ nghệ thuật
  | "gifting_moment"       // Khoảnh khắc trao tặng hoa rạng ngời

export type StorylineMode = "single_shot" | "four_part_story_carousel"

export interface VisualStoryConfigInput {
  readonly cameraAngle?: CameraAngleType
  readonly humanInteraction?: HumanInteractionType
  readonly storylineMode?: StorylineMode
  readonly modelPersona?: {
    readonly outfitStyle?: "casual_chic" | "luxury_evening" | "minimal_linen" | "florist_apron"
    readonly ethnicity?: "vietnamese_asian" | "international"
  }
}

export interface CreativeStudioJobInput {
  readonly jobId: string
  readonly organizationId: string
  readonly taskType: CreativeStudioTaskType
  readonly sourceImage: SourceImageInput
  readonly productPassport: ProductPassportInput
  readonly sceneConfig?: SceneConfigInput
  readonly visualStoryConfig?: VisualStoryConfigInput
  readonly executionParams: ExecutionParamsInput
}

// ============================================================
// 2. OUTPUT DOMAIN TYPES
// ============================================================

export interface GeneratedAssetOutput {
  readonly ratio: "1:1" | "4:5" | "9:16" | "16:9"
  readonly storageKey: string
  readonly url: string
  readonly width: number
  readonly height: number
  readonly format: "png" | "jpeg" | "webp"
  readonly hasWatermark: boolean
}

export interface IntegrityAuditOutput {
  readonly subjectPixelIdentity: number // Tỷ lệ pixel trùng khớp (0.0 - 1.0)
  readonly verdict: "SAFE" | "WARNING" | "REJECTED"
  readonly metrics: {
    readonly colorConsistencyScore: number
    readonly geometryPreservationScore: number
    readonly componentBomMatch: boolean
  }
  readonly warnings?: readonly string[]
}

export interface UsageMetricsOutput {
  readonly costUsd: number
  readonly creditsDeducted: number
  readonly gpuInferenceSeconds?: number
}

export interface StoryCarouselChapterOutput {
  readonly chapterNumber: 1 | 2 | 3 | 4
  readonly chapterTitle: string
  readonly asset: GeneratedAssetOutput
  readonly narrativeCaption: string
}

export interface CreativeStudioJobOutput {
  readonly jobId: string
  readonly status: "COMPLETED" | "FAILED" | "FLAGGED_WARNING"
  readonly providerInfo: {
    readonly providerName: string
    readonly modelVersion: string
    readonly latencyMs: number
  }
  readonly generatedAssets: readonly GeneratedAssetOutput[]
  readonly storyCarousel?: readonly StoryCarouselChapterOutput[]
  readonly integrityAudit: IntegrityAuditOutput
  readonly usageMetrics: UsageMetricsOutput
  readonly error?: string
}

// ============================================================
// 3. VALIDATION UTILITIES (PURE DOMAIN GUARDS)
// ============================================================

export function validateCreativeStudioInput(input: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!input || typeof input !== "object") {
    return { isValid: false, errors: ["Input phải là một object JSON"] }
  }

  const data = input as Record<string, unknown>

  if (!data.jobId || typeof data.jobId !== "string") {
    errors.push("jobId là bắt buộc và phải là chuỗi")
  }
  if (!data.organizationId || typeof data.organizationId !== "string") {
    errors.push("organizationId là bắt buộc và phải là chuỗi")
  }
  if (!data.taskType || !["OPTIMIZE_MASTER", "GENERATE_SCENE_VARIANT", "RETOUCH_DETAIL"].includes(String(data.taskType))) {
    errors.push("taskType không hợp lệ (phải là OPTIMIZE_MASTER, GENERATE_SCENE_VARIANT, hoặc RETOUCH_DETAIL)")
  }

  // Check sourceImage
  const src = data.sourceImage as Record<string, unknown> | undefined
  if (!src || typeof src !== "object") {
    errors.push("sourceImage là bắt buộc")
  } else {
    if (!src.assetId || typeof src.assetId !== "string") errors.push("sourceImage.assetId là bắt buộc")
    if (!src.imageUrl || typeof src.imageUrl !== "string") errors.push("sourceImage.imageUrl là bắt buộc")
  }

  // Check productPassport
  const passport = data.productPassport as Record<string, unknown> | undefined
  if (!passport || typeof passport !== "object") {
    errors.push("productPassport là bắt buộc (trích xuất từ M01)")
  } else {
    const flowers = passport.primaryFlowers
    if (!Array.isArray(flowers) || flowers.length === 0) {
      errors.push("productPassport.primaryFlowers phải là một mảng có ít nhất 1 nguyên liệu")
    }
  }

  // Check executionParams
  const params = data.executionParams as Record<string, unknown> | undefined
  if (!params || typeof params !== "object") {
    errors.push("executionParams là bắt buộc")
  } else {
    if (!Array.isArray(params.targetRatios) || params.targetRatios.length === 0) {
      errors.push("executionParams.targetRatios phải chứa ít nhất một tỉ lệ")
    }
    const strictness = Number(params.subjectProtectionStrictness ?? 0.99)
    if (isNaN(strictness) || strictness < 0.9 || strictness > 1.0) {
      errors.push("executionParams.subjectProtectionStrictness phải nằm trong khoảng 0.90 đến 1.0")
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateCreativeStudioOutput(output: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!output || typeof output !== "object") {
    return { isValid: false, errors: ["Output phải là một object JSON"] }
  }

  const data = output as Record<string, unknown>

  if (!data.jobId || typeof data.jobId !== "string") errors.push("jobId là bắt buộc")
  if (!data.status || !["COMPLETED", "FAILED", "FLAGGED_WARNING"].includes(String(data.status))) {
    errors.push("status không hợp lệ (COMPLETED | FAILED | FLAGGED_WARNING)")
  }
  if (!data.providerInfo || typeof data.providerInfo !== "object") {
    errors.push("providerInfo là bắt buộc")
  }

  if (data.status === "COMPLETED") {
    if (!Array.isArray(data.generatedAssets) || data.generatedAssets.length === 0) {
      errors.push("generatedAssets phải chứa ít nhất 1 ảnh khi trạng thái là COMPLETED")
    }
    const audit = data.integrityAudit as Record<string, unknown> | undefined
    if (!audit || typeof audit !== "object") {
      errors.push("integrityAudit là bắt buộc để chứng minh tính toàn vẹn sản phẩm")
    } else {
      if (typeof audit.subjectPixelIdentity !== "number") {
        errors.push("integrityAudit.subjectPixelIdentity bắt buộc phải có số đo")
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
