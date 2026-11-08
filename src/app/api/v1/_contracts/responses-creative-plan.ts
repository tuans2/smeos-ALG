import { z } from "zod"

import { timestamp } from "./responses-orders"

/**
 * Phản hồi lập kế hoạch sản xuất Creative Studio (`/creative-production/plan`, `/produce`, `/package`) — hàm thuần, không
 * gọi AI, không ghi CSDL (OpenAPI nội bộ, PO 07/11/2026). Sinh từ kiểu TS của use-case rồi kiểm bằng phản hồi thật ở
 * `tests/tenant/internal-contract-creative.test.ts`.
 */
const MODE = z.enum(["AUTHENTIC", "CREATIVE"])
const BEAT = z.enum(["SETUP", "RISING", "CLIMAX", "RESOLUTION", "CTA"])
const MOTION = z.enum(["zoom_in", "zoom_out", "pan_left", "pan_right", "pan_up", "static"])
const TRANSITION = z.enum(["fade", "slide_left", "slide_right", "dissolve", "wipe", "none"])
const RATIO = z.enum(["1:1", "4:5", "9:16", "16:9", "3:4"])
const VIDEO_FORMAT = z.enum(["1:1", "9:16", "16:9"])
const PLATFORM = z.enum(["facebook", "tiktok", "instagram", "zalo"])

const arc = z.strictObject({
  topicId: z.string(),
  topicTitle: z.string(),
  mode: MODE,
  emotionalTone: z.string(),
  narrativeReasoning: z.string(),
  scenes: z.array(
    z.strictObject({
      sceneIndex: z.number(),
      beat: BEAT,
      beatTitle: z.string(),
      sceneDescription: z.string(),
      voiceScript: z.string(),
      textOverlay: z.string(),
      durationSeconds: z.number(),
      transitionEffect: TRANSITION,
      motionEffect: MOTION,
      connectionToNext: z.string(),
      authenticEffect: z
        .strictObject({
          cropRatio: RATIO,
          motionEffect: MOTION,
          overlayText: z.string().optional(),
          overlayPosition: z.enum(["top", "bottom", "center"]).optional(),
          showBrandBadge: z.boolean().optional(),
          showPrice: z.boolean().optional(),
        })
        .optional(),
      creativeConfig: z
        .strictObject({ preset: z.string(), lighting: z.string(), surface: z.string(), backgroundColor: z.string().optional(), visualStyle: z.string().optional() })
        .optional(),
    })
  ),
  totalDurationSeconds: z.number(),
})
const ASSET_TYPE = z.enum(["IMAGE_VARIANT", "IMAGE_CROP", "VIDEO_STORY", "VIDEO_OVERLAY", "AUDIO_VOICEOVER", "AUDIO_MIX", "CONTENT_CAPTION", "CONTENT_HASHTAGS", "CONTENT_POST"])
const planItem = z.strictObject({
  assetType: ASSET_TYPE,
  topicId: z.string(),
  priority: z.number(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "FAILED"]),
  jobId: z.string().optional(),
  description: z.string(),
  /**
   * facebook · tiktok · instagram · zalo · all — riêng mục cắt khung (AUTHENTIC) mang tên khung, vd. `tiktok_story`
   * (kiểu TS khai hẹp hơn giá trị thật).
   */
  targetPlatform: z.string().optional(),
})
const mediaPlan = z.strictObject({ briefId: z.string(), mode: MODE, items: z.array(planItem), estimatedCredits: z.number(), estimatedTimeMinutes: z.number() })

export const planResponse = z.strictObject({
  mediaPlan,
  totalEstimatedCredits: z.number(),
  jobsSummary: z.strictObject({ imageJobs: z.number(), videoJobs: z.number(), audioJobs: z.number(), contentJobs: z.number() }),
})

const cropRequest = z.strictObject({
  ratio: RATIO,
  platform: z.string(),
  overlayText: z.string().optional(),
  showLogo: z.boolean(),
  showPrice: z.boolean(),
  badgeText: z.string().optional(),
})
const voiceScene = z.strictObject({ sceneIndex: z.number(), voiceScript: z.string(), targetDurationSeconds: z.number() })
const briefs = z.strictObject({
  topicId: z.string(),
  topicTitle: z.string(),
  mode: MODE,
  imageBrief: z.strictObject({
    topicId: z.string(),
    mode: MODE,
    variantRequests: z.array(
      z.strictObject({ sceneIndex: z.number(), beat: BEAT, prompt: z.string(), preset: z.string(), lighting: z.string(), surface: z.string(), targetRatio: RATIO })
    ),
    cropRequests: z.array(cropRequest),
  }),
  videoBrief: z.strictObject({
    topicId: z.string(),
    mode: MODE,
    scenes: z.array(
      z.strictObject({
        sceneIndex: z.number(),
        beat: BEAT,
        imageSource: z.enum(["original", "variant"]),
        voiceScript: z.string(),
        textOverlay: z.string(),
        durationSeconds: z.number(),
        motionEffect: MOTION,
        transitionEffect: TRANSITION,
      })
    ),
    voiceId: z.string(),
    musicMood: z.string(),
    totalDurationSeconds: z.number(),
    videoFormat: VIDEO_FORMAT,
  }),
  audioBrief: z.strictObject({ topicId: z.string(), mode: MODE, voiceId: z.string(), musicMood: z.string(), scenes: z.array(voiceScene), totalDurationSeconds: z.number() }),
  contentBrief: z.strictObject({
    topicId: z.string(),
    mode: MODE,
    captionRequests: z.array(
      z.strictObject({
        platform: PLATFORM,
        tone: z.string(),
        hook: z.string(),
        cta: z.string(),
        maxLength: z.number(),
        productName: z.string(),
        category: z.string(),
        targetAudience: z.string().optional(),
      })
    ),
    hashtagSuggestions: z.array(z.string()),
  }),
})
const audioJobInput = z.strictObject({
  organizationId: z.string(),
  taskType: z.enum(["AUDIO_MIX", "VOICEOVER", "MUSIC_SELECT", "VOICE_CLONE"]),
  scenes: z.array(voiceScene),
  totalDurationSeconds: z.number(),
  voiceId: z.string(),
  providerKey: z.enum(["openai", "elevenlabs", "minimax", "edge_tts", "google_cloud", "local_fallback"]).optional(),
  qualityTier: z.enum(["standard", "hd", "premium"]).optional(),
  musicTrackId: z.string().optional(),
  musicMood: z.enum(["none", "romantic", "upbeat", "chill", "warm", "luxury"]).optional(),
  voiceVolume: z.number().optional(),
  bgmDuckingVolume: z.number().optional(),
  bgmNormalVolume: z.number().optional(),
})
const contentInput = z.strictObject({
  platform: PLATFORM,
  mode: MODE,
  product: z.strictObject({
    name: z.string(),
    category: z.string(),
    style: z.string(),
    components: z.array(z.string()),
    colors: z.array(z.string()),
    priceRange: z.string().optional(),
    occasions: z.array(z.string()).optional(),
  }),
  topic: z.strictObject({ title: z.string(), angle: z.string(), hook: z.string(), cta: z.string(), emotionalTone: z.string() }),
  captionSpec: z.strictObject({ tone: z.string(), maxLength: z.number(), hashtags: z.array(z.string()) }),
})
const topicBase = { topicId: z.string(), topicTitle: z.string(), arc, briefs, audioJobInput, contentInputs: z.array(contentInput), estimatedCredits: z.number() }

/** CREATIVE: ảnh biến thể theo cảnh + bộ dựng video. */
const creativeTopic = z.strictObject({
  ...topicBase,
  variantJobInputs: z.array(
    z.strictObject({
      sourceImage: z.string(),
      sourceImageStorageKey: z.string().optional(),
      productPassport: z.strictObject({ productName: z.string(), category: z.string(), style: z.string(), components: z.array(z.string()), colors: z.array(z.string()) }),
      sceneConfig: z.strictObject({ preset: z.string(), lighting: z.string(), surface: z.string(), backgroundColor: z.string().optional() }),
      visualStoryConfig: z.strictObject({ cameraAngle: z.string().optional(), includeHuman: z.boolean().optional() }).optional(),
      topicId: z.string(),
      topicTitle: z.string(),
      beat: z.string(),
      sceneIndex: z.number(),
    })
  ),
  /** `build` là hàm ở máy chủ — không có trong JSON. */
  videoJobBuilder: z.strictObject({ videoFormat: VIDEO_FORMAT, sceneCount: z.number(), totalDurationSeconds: z.number() }),
})
/** AUTHENTIC: cắt khung ảnh thật + video từ ảnh gốc. */
const authenticTopic = z.strictObject({
  ...topicBase,
  imageCrops: z.array(cropRequest),
  videoJobInput: z.strictObject({
    productInfo: z.strictObject({ name: z.string(), category: z.string() }),
    videoFormat: VIDEO_FORMAT,
    totalDurationSeconds: z.number(),
    voiceCode: z.string(),
    musicTrack: z.string().nullable(),
    subtitleStyle: z.string(),
    scenes: z.array(
      z.strictObject({
        sceneIndex: z.number(),
        imageUrl: z.string(),
        voiceScript: z.string(),
        textOverlay: z.string(),
        durationSeconds: z.number(),
        motionEffect: MOTION,
        transitionEffect: TRANSITION,
      })
    ),
    topicId: z.string(),
    topicTitle: z.string(),
    productionMode: MODE,
  }),
})
const produceTail = { totalEstimatedCredits: z.number(), mediaPlanItems: z.array(planItem) }
export const produceResponse = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("CREATIVE"), topicResults: z.array(creativeTopic), ...produceTail }),
  z.strictObject({ mode: z.literal("AUTHENTIC"), topicResults: z.array(authenticTopic), ...produceTail }),
])

export const packageResponse = z.strictObject({
  campaign: z.strictObject({
    campaignId: z.string(),
    campaignName: z.string(),
    mode: MODE,
    topicIds: z.array(z.string()),
    narrativeArc: arc.optional(),
    mediaPlan,
    status: z.enum(["DRAFT", "PRODUCING", "READY", "PUBLISHED"]),
    producedAssets: z.array(
      z.strictObject({
        assetType: ASSET_TYPE,
        url: z.string(),
        storageKey: z.string(),
        topicId: z.string(),
        jobId: z.string(),
        targetPlatform: z.string().optional(),
        approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]),
      })
    ),
    createdAt: timestamp,
  }),
  totalJobsCount: z.number(),
  costSummary: z.strictObject({ imageCredits: z.number(), videoCredits: z.number(), audioCredits: z.number(), contentCredits: z.number(), totalCredits: z.number() }),
})
