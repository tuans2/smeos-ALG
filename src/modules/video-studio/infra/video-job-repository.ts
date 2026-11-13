import { prisma } from "@/core/tenancy/infra/prisma";
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy";
import {
  video_jobs,
  video_scenes,
  video_format,
  video_stage,
  approval_state,
  PrismaClient,
} from "./entities";
import { VideoSceneItem } from "../domain/video-types";

export type DbClient = Pick<
  PrismaClient,
  "video_jobs" | "video_scenes" | "$transaction"
>;

import type {
  IVideoJobRepository,
  CreateVideoJobDbInput as ICreateVideoJobDbInput,
  VideoJobWithScenes as IVideoJobWithScenes,
  ListVideoJobsOptions,
  AttachPlanAudioInput,
  UpdateStageExtra,
} from "../domain/repositories/video-job-repository.interface";

export type {
  IVideoJobRepository,
  ListVideoJobsOptions,
  AttachPlanAudioInput,
  UpdateStageExtra,
};

export type CreateVideoJobDbInput = ICreateVideoJobDbInput;
export type VideoJobWithScenes = IVideoJobWithScenes;

export class VideoJobRepository implements IVideoJobRepository {
  constructor(private readonly db: DbClient = prisma) {}

  /**
   * Tạo một video job mới kèm danh sách scenes ban đầu (nếu có) trong 1 transaction.
   */
  async create(
    ctx: TenantContext,
    input: CreateVideoJobDbInput
  ): Promise<VideoJobWithScenes> {
    const jobData = scopedData(ctx, {
      created_by: ctx.userId,
      product_id: input.productId ?? null,
      title: input.title,
      format: input.format,
      stage: "DRAFT" as video_stage,
      duration_seconds: input.durationSeconds ?? 15,
      aspect_ratio: input.aspectRatio ?? "9:16",
      music_track: input.musicTrack ?? null,
      voice_code: input.voiceCode ?? null,
      has_subtitle: input.hasSubtitle ?? true,
      caption_style: input.captionStyle ?? "MODERN_BADGE",
      has_watermark: input.hasWatermark ?? false,
      cost_credits: input.costCredits ?? 0,
      script_approval: "PENDING" as approval_state,
      video_approval: "PENDING" as approval_state,
    });

    const job = await this.db.video_jobs.create({
      data: {
        ...jobData,
        scenes: {
          create: input.scenes.map((scene, idx) => ({
            scene_index: scene.sceneIndex ?? idx + 1,
            duration_seconds: scene.durationSeconds || 3.0,
            // Mã asset trước (ảnh ký có hạn không phải định danh bền) — 24/09/2026.
            image_asset_id: scene.imageAssetId || scene.imageUrl || null,
            text_overlay: scene.textOverlay ?? null,
            voice_script: scene.voiceScript ?? null,
            transition_effect: scene.transitionEffect ?? "fade",
            motion_effect: scene.motionEffect ?? null,
          })),
        },
      },
      include: {
        scenes: {
          orderBy: { scene_index: "asc" },
        },
      },
    });

    return job;
  }

  /**
   * Tìm job theo ID có gác cách ly tenant.
   */
  async findById(
    ctx: TenantContext,
    id: string
  ): Promise<VideoJobWithScenes | null> {
    return this.db.video_jobs.findFirst({
      where: scopedWhere(ctx, { id }),
      include: {
        scenes: {
          orderBy: { scene_index: "asc" },
        },
      },
    });
  }

  /**
   * Lấy danh sách jobs của tổ chức.
   */
  async list(
    ctx: TenantContext,
    options: {
      productId?: string | undefined;
      format?: video_format | undefined;
      stage?: video_stage | undefined;
      limit?: number | undefined;
    }
  ): Promise<VideoJobWithScenes[]> {
    const limit = Math.min(options.limit ?? 20, 50);

    return this.db.video_jobs.findMany({
      where: scopedWhere(ctx, {
        trashed_at: null, // trong thùng rác (Kho dữ liệu) thì không hiện
        ...(options.productId ? { product_id: options.productId } : {}),
        ...(options.format ? { format: options.format } : {}),
        ...(options.stage ? { stage: options.stage } : {}),
      }),
      include: {
        scenes: {
          orderBy: { scene_index: "asc" },
        },
      },
      orderBy: { created_at: "desc" },
      take: limit,
    });
  }

  /**
   * Cập nhật danh sách kịch bản phân cảnh (xóa cảnh cũ, tạo lại cảnh mới theo thứ tự).
   */
  async updateScenes(
    ctx: TenantContext,
    jobId: string,
    scenes: VideoSceneItem[]
  ): Promise<VideoJobWithScenes | null> {
    const job = await this.findById(ctx, jobId);
    if (!job) return null;

    // Xóa cảnh cũ và ghi cảnh mới
    await this.db.video_scenes.deleteMany({
      where: { video_job_id: jobId },
    });

    await this.db.video_scenes.createMany({
      data: scenes.map((s, idx) => ({
        video_job_id: jobId,
        organization_id: ctx.organizationId,
        scene_index: idx + 1,
        duration_seconds: s.durationSeconds || 3.0,
        image_asset_id: s.imageAssetId || s.imageUrl || null,
        text_overlay: s.textOverlay ?? null,
        voice_script: s.voiceScript ?? null,
        transition_effect: s.transitionEffect ?? "fade",
        motion_effect: s.motionEffect ?? null,
      })),
    });

    const totalDuration = scenes.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

    return this.db.video_jobs.update({
      where: scopedWhere(ctx, { id: jobId }),
      data: {
        duration_seconds: Math.round(totalDuration),
        stage: "SCRIPT_READY" as video_stage,
      },
      include: {
        scenes: {
          orderBy: { scene_index: "asc" },
        },
      },
    });
  }

  /** Đợt 4 (24/09/2026): gắn kịch bản sản xuất tổng + bản phối Khu vực C vào job. */
  async attachPlanAudio(
    ctx: TenantContext,
    jobId: string,
    input: { scenePlanId: string; scenePlanRevision: number; audioJobId: string | null; audioStorageKey: string | null }
  ): Promise<void> {
    await this.db.video_jobs.updateMany({
      where: scopedWhere(ctx, { id: jobId }),
      data: {
        scene_plan_id: input.scenePlanId,
        scene_plan_revision: input.scenePlanRevision,
        audio_job_id: input.audioJobId,
        audio_storage_key: input.audioStorageKey,
      },
    });
  }

  /**
   * Gắn ảnh cho những cảnh CÒN TRỐNG ảnh — không đổi chữ/lời/giai đoạn duyệt
   * (24/09/2026: render lấp ảnh Khu vực D / Master thay vì báo lỗi).
   */
  async fillMissingSceneImages(ctx: TenantContext, jobId: string, images: ReadonlyMap<number, string>): Promise<void> {
    const job = await this.findById(ctx, jobId);
    if (!job) return;
    for (const [sceneIndex, assetId] of images) {
      await this.db.video_scenes.updateMany({
        where: { video_job_id: job.id, scene_index: sceneIndex, image_asset_id: null },
        data: { image_asset_id: assetId },
      });
    }
  }

  /**
   * Phê duyệt Kịch bản (Cổng 1).
   */
  async approveScript(
    ctx: TenantContext,
    jobId: string,
    approverUserId: string
  ): Promise<video_jobs | null> {
    const job = await this.findById(ctx, jobId);
    if (!job) return null;

    return this.db.video_jobs.update({
      where: scopedWhere(ctx, { id: jobId }),
      data: {
        script_approval: "APPROVED" as approval_state,
        script_approved_at: new Date(),
        script_approved_by: approverUserId,
        stage: "SCRIPT_APPROVED" as video_stage,
      },
    });
  }

  /**
   * Cập nhật tiến độ / trạng thái render của job.
   */
  async updateStage(
    ctx: TenantContext,
    jobId: string,
    stage: video_stage,
    extra?: {
      finalVideoUrl?: string | undefined;
      finalAssetId?: string | undefined;
      errorMessage?: string | undefined;
    }
  ): Promise<video_jobs | null> {
    const job = await this.findById(ctx, jobId);
    if (!job) return null;

    return this.db.video_jobs.update({
      where: scopedWhere(ctx, { id: jobId }),
      data: {
        stage,
        ...(extra?.finalVideoUrl ? { final_video_url: extra.finalVideoUrl } : {}),
        ...(extra?.finalAssetId ? { final_asset_id: extra.finalAssetId } : {}),
        ...(extra?.errorMessage !== undefined ? { error_message: extra.errorMessage } : {}),
      },
    });
  }

  /**
   * Phê duyệt Video thành phẩm (Cổng 2).
   */
  async approveVideo(
    ctx: TenantContext,
    jobId: string,
    approverUserId: string
  ): Promise<video_jobs | null> {
    const job = await this.findById(ctx, jobId);
    if (!job) return null;

    return this.db.video_jobs.update({
      where: scopedWhere(ctx, { id: jobId }),
      data: {
        video_approval: "APPROVED" as approval_state,
        video_approved_at: new Date(),
        video_approved_by: approverUserId,
        stage: "APPROVED" as video_stage,
      },
    });
  }
}

let defaultVideoJobRepository: IVideoJobRepository | null = null;

export function getVideoJobRepository(): IVideoJobRepository {
  if (!defaultVideoJobRepository) {
    defaultVideoJobRepository = new VideoJobRepository();
  }
  return defaultVideoJobRepository;
}

