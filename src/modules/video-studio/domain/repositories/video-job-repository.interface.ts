import type { TenantContext } from "@/core/tenancy"
import type { VideoFormat, VideoStage, ApprovalState, VideoSceneItem } from "../video-types"

export interface VideoSceneRecord {
  id: string
  video_job_id: string
  organization_id: string
  scene_index: number
  duration_seconds: number
  image_asset_id: string | null
  text_overlay: string | null
  voice_script: string | null
  transition_effect: string | null
  motion_effect: string | null
  created_at: Date
  updated_at: Date
}

export interface VideoJobRecord {
  id: string
  organization_id: string
  product_id: string | null
  title: string
  format: VideoFormat
  stage: VideoStage
  duration_seconds: number
  aspect_ratio: string
  music_track: string | null
  voice_code: string | null
  has_subtitle: boolean
  caption_style: string
  has_watermark: boolean
  cost_credits: number
  script_approval: ApprovalState
  script_approved_at: Date | null
  script_approved_by: string | null
  video_approval: ApprovalState
  video_approved_at: Date | null
  video_approved_by: string | null
  final_video_url: string | null
  final_asset_id: string | null
  error_message: string | null
  scene_plan_id: string | null
  scene_plan_revision: number | null
  audio_job_id: string | null
  audio_storage_key: string | null
  created_at: Date
  updated_at: Date
}

export type VideoJobWithScenes = VideoJobRecord & {
  scenes: VideoSceneRecord[]
}

export interface CreateVideoJobDbInput {
  productId?: string | null | undefined
  title: string
  format: VideoFormat
  durationSeconds?: number | undefined
  aspectRatio?: string | undefined
  musicTrack?: string | null | undefined
  voiceCode?: string | null | undefined
  hasSubtitle?: boolean | undefined
  captionStyle?: string | undefined
  hasWatermark?: boolean | undefined
  costCredits?: number | undefined
  scenes: VideoSceneItem[]
}

export interface ListVideoJobsOptions {
  productId?: string | undefined
  format?: VideoFormat | undefined
  stage?: VideoStage | undefined
  limit?: number | undefined
}

export interface UpdateStageExtra {
  finalVideoUrl?: string | undefined
  finalAssetId?: string | undefined
  errorMessage?: string | undefined
}

export interface AttachPlanAudioInput {
  scenePlanId: string
  scenePlanRevision: number
  audioJobId: string | null
  audioStorageKey: string | null
}

export interface IVideoJobRepository {
  create(ctx: TenantContext, input: CreateVideoJobDbInput): Promise<VideoJobWithScenes>
  findById(ctx: TenantContext, id: string): Promise<VideoJobWithScenes | null>
  list(ctx: TenantContext, options: ListVideoJobsOptions): Promise<VideoJobWithScenes[]>
  updateScenes(ctx: TenantContext, jobId: string, scenes: VideoSceneItem[]): Promise<VideoJobWithScenes | null>
  attachPlanAudio(ctx: TenantContext, jobId: string, input: AttachPlanAudioInput): Promise<void>
  fillMissingSceneImages(ctx: TenantContext, jobId: string, images: ReadonlyMap<number, string>): Promise<void>
  approveScript(ctx: TenantContext, jobId: string, approverUserId: string): Promise<VideoJobRecord | null>
  updateStage(ctx: TenantContext, jobId: string, stage: VideoStage, extra?: UpdateStageExtra): Promise<VideoJobRecord | null>
  approveVideo(ctx: TenantContext, jobId: string, approverUserId: string): Promise<VideoJobRecord | null>
}
