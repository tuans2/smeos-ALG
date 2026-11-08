import { type TenantContext } from "@/core/tenancy";
import { AppError } from "@/core/http/errors";
import { requireCapability } from "@/core/rbac/capabilities";
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job";
import type { IVideoJobRepository } from "../domain/repositories/video-job-repository.interface";
import {
  getVideoJobRepository,
  type VideoJobWithScenes,
} from "../infra/video-job-repository";
import { video_scenes } from "../infra/entities";
import { canStartRender } from "../domain/video-approval-rules";
import type { VideoStage } from "../domain/video-types";
import type { IAssetRepository } from "@/modules/assets/domain/repositories/asset-repository.interface";
import { getAssetRepository } from "@/modules/assets/infra/asset-repository";
import { providerOrderFor } from "@/modules/creative-production/use-cases/provider-preferences";
import { videoRenderCredit } from "@/modules/usage/domain/pricing";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DispatchRenderResult {
  videoJob: VideoJobWithScenes;
  generationJobId: string;
}

export class DispatchVideoRenderUseCase {
  constructor(
    private readonly repo: IVideoJobRepository = getVideoJobRepository(),
    private readonly assetRepo: IAssetRepository = getAssetRepository()
  ) {}

  async execute(
    ctx: TenantContext,
    jobId: string,
    options: {
      sceneImages?: ReadonlyArray<{ sceneIndex: number; assetId: string }>;
      /** Nhà cung cấp chọn cho lượt này (`veo | kling | runway | luma`), `local_cinematic` = Ken Burns
       *  cục bộ đích danh, vắng = theo thứ tự ưu tiên của tiệm (PO 25/09/2026). */
      videoProvider?: string | null;
    } = {}
  ): Promise<DispatchRenderResult> {
    requireCapability(ctx, "I1");

    const job = await this.repo.findById(ctx, jobId);
    if (!job) {
      throw new AppError("NOT_FOUND", `Không tìm thấy tác vụ video với mã: ${jobId}`);
    }

    const check = canStartRender({
      stage: job.stage,
      scriptApproval: job.script_approval,
    });

    if (!check.allowed) {
      throw new AppError("UNPROCESSABLE_ENTITY", check.reason || "Kịch bản chưa sẵn sàng để render");
    }

    // Ảnh cảnh lưu bằng MÃ ASSET (Khu vực D / Master Image); worker chỉ đọc
    // được đường dẫn kho — đổi mã asset thành `storage_key` của ĐÚNG tổ chức
    // (24/09/2026). Trước đây worker không tìm được ảnh theo mã asset và lặng lẽ
    // dựng video bằng ảnh mẫu có sẵn trong kho.
    const assetRepo = this.assetRepo;

    // Cảnh còn trống ảnh (job tạo trước khi Khu vực D sinh ảnh, hoặc storyboard
    // dựng lúc chưa tìm được Master): lấp bằng ảnh storyboard gửi kèm, không có
    // thì ảnh Khu vực D mới nhất cùng số cảnh của Master sản phẩm, rồi Master.
    const trong = (job.scenes as video_scenes[]).filter((s) => !s.image_asset_id);
    if (trong.length > 0) {
      const fill = await this.findFillImages(ctx, job.product_id, trong.map((s) => s.scene_index), options.sceneImages ?? [], assetRepo);
      if (fill.size > 0) {
        await this.repo.fillMissingSceneImages(ctx, jobId, fill);
        const reloaded = await this.repo.findById(ctx, jobId);
        if (reloaded) job.scenes = reloaded.scenes;
      }
    }

    const resolvedImages = new Map<string, string>();
    for (const s of job.scenes as video_scenes[]) {
      const ref = s.image_asset_id;
      if (!ref || !UUID_RE.test(ref) || resolvedImages.has(ref)) continue;
      const asset = await assetRepo.findById(ctx, ref);
      if (!asset) throw new AppError("UNPROCESSABLE_ENTITY", `Ảnh của cảnh #${s.scene_index} không còn trong kho (asset ${ref})`);
      resolvedImages.set(ref, asset.storage_key);
    }
    const missing = (job.scenes as video_scenes[]).filter((s) => !s.image_asset_id);
    if (missing.length > 0) {
      throw new AppError(
        "UNPROCESSABLE_ENTITY",
        `Cảnh ${missing.map((s) => `#${s.scene_index}`).join(", ")} chưa có ảnh sản phẩm và không tìm được ảnh Khu vực D / Master Image của sản phẩm — sinh ảnh ở Khu vực D rồi bấm "Lấy ảnh mới nhất từ Khu vực D"`
      );
    }

    // Nhà cung cấp trước (PO 25/09/2026): thứ tự thử gửi worker; giá theo bên đứng đầu.
    const providerOrder =
      options.videoProvider === "local_cinematic" ? [] : await providerOrderFor(ctx, "video", options.videoProvider ?? null);
    const sceneCount = (job.scenes as video_scenes[]).length;
    const plannedProvider = providerOrder[0] ?? null;
    const costCredit = videoRenderCredit(plannedProvider, sceneCount);

    // Đổi trạng thái sang RENDERING; đưa vào hàng đợi lỗi (hết credit…) thì trả về bước cũ — trước đây video
    // kẹt RENDERING mà không có job nào (audit hành trình V1, gói UJ-03).
    const previousStage = job.stage as VideoStage;
    await this.repo.updateStage(ctx, jobId, "RENDERING");

    // Đưa vào hàng đợi generation_jobs (LISTEN / NOTIFY worker)
    const idempotencyKey = `video-render-${jobId}-${Date.now()}`;
    const enqueued = await enqueueJob(ctx, {
      feature: "video.render",
      idempotencyKey,
      productId: job.product_id,
      costCredit,
      payload: {
        videoJobId: job.id,
        provider_order: providerOrder,
        cost_plan: { provider: plannedProvider, scenes: sceneCount, credit: costCredit },
        title: job.title,
        format: job.format,
        durationSeconds: job.duration_seconds,
        aspectRatio: job.aspect_ratio,
        // Đợt 4: có bản phối Khu vực C thì worker dùng NGUYÊN bản đó — không đọc
        // lại TTS, không phủ thêm nhạc (quyết định PO 24/09/2026).
        ...(job.audio_storage_key && job.audio_storage_key.startsWith(`org/${ctx.organizationId}/`)
          ? { audioStorageKey: job.audio_storage_key, musicTrack: null, voiceCode: null }
          : { musicTrack: job.music_track, voiceCode: job.voice_code }),
        captionStyle: job.caption_style,
        hasSubtitle: job.has_subtitle,
        hasWatermark: job.has_watermark,
        scenes: job.scenes.map((s: video_scenes) => ({
          sceneIndex: s.scene_index,
          durationSeconds: s.duration_seconds,
          imageAssetId: (s.image_asset_id && resolvedImages.get(s.image_asset_id)) || s.image_asset_id,
          textOverlay: s.text_overlay,
          voiceScript: s.voice_script,
          transitionEffect: s.transition_effect,
          // Worker (`local_cinematic.py`) đọc `motionEffect`; vắng thì tự xoay vòng.
          motionEffect: s.motion_effect ?? undefined,
        })),
      },
    }).catch(async (error: unknown) => {
      await this.repo.updateStage(ctx, jobId, previousStage);
      throw error;
    });

    const updatedJob = await this.repo.findById(ctx, jobId);
    if (!updatedJob) {
      throw new Error("Không thể tải lại thông tin video job sau khi đưa vào hàng đợi");
    }

    return {
      videoJob: updatedJob,
      generationJobId: enqueued.job.id,
    };
  }

  /** sceneIndex → assetId cho các cảnh trống ảnh. Chỉ nhận asset của ĐÚNG tổ chức. */
  private async findFillImages(
    ctx: TenantContext,
    productId: string | null,
    sceneIndexes: number[],
    provided: ReadonlyArray<{ sceneIndex: number; assetId: string }>,
    assetRepo: IAssetRepository
  ): Promise<Map<number, string>> {
    const out = new Map<number, string>();
    const USABLE = new Set(["MASTER", "MARKETING", "ORIGINAL", "ENHANCED"]);
    for (const p of provided) {
      if (!sceneIndexes.includes(p.sceneIndex) || out.has(p.sceneIndex)) continue;
      const a = await assetRepo.findById(ctx, p.assetId);
      if (a && USABLE.has(a.kind) && a.approval_state !== "REJECTED") out.set(p.sceneIndex, a.id);
    }
    const conLai = sceneIndexes.filter((i) => !out.has(i));
    if (conLai.length === 0 || !productId) return out;

    const [master] = await assetRepo.list(ctx, { productId, kind: "MASTER", approvalState: "APPROVED", limit: 1 });
    if (!master) return out;
    const variants = await assetRepo.list(ctx, { parentAssetId: master.id, kind: "MARKETING", limit: 200 });
    for (const idx of conLai) {
      const v = variants.find((a) => {
        const m = (a.metadata ?? {}) as Record<string, unknown>;
        return m.scene_index === idx && (m.variant_key === "styled" || m.variant_key === "branded") && a.approval_state !== "REJECTED";
      });
      out.set(idx, v?.id ?? master.id);
    }
    return out;
  }
}
