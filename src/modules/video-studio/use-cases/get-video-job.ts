import { type TenantContext } from "@/core/tenancy";
import { requireCapability } from "@/core/rbac/capabilities";
import { videoJobNotFound } from "./video-errors";
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory";
import { ASSET_VIEW_URL_TTL_SECONDS } from "@/modules/assets/use-cases/get-asset-view-url";
import { getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository";
import { lyDoHoanCredit } from "@/modules/usage/domain/refund-policy";
import { refundJob } from "@/modules/usage/use-cases/refund-job";
import { refundPartial } from "@/modules/usage/use-cases/refund-partial";
import { videoRenderRefund } from "../domain/video-provider-billing";
import type { IVideoJobRepository } from "../domain/repositories/video-job-repository.interface";
import {
  getVideoJobRepository,
  type VideoJobWithScenes,
} from "../infra/video-job-repository";

export class GetVideoJobUseCase {
  constructor(private readonly repo: IVideoJobRepository = getVideoJobRepository()) {}

  async execute(
    ctx: TenantContext,
    jobId: string
  ): Promise<VideoJobWithScenes> {
    requireCapability(ctx, "I1");

    const job = await this.repo.findById(ctx, jobId);
    if (!job) {
      throw videoJobNotFound();
    }

    await settleVideoRenderCredit(ctx, jobId).catch(() => undefined);
    return job;
  }
}

/**
 * Hoàn credit lúc đọc (25/09/2026, cùng khuôn biến thể/tối ưu ảnh) — idempotent:
 * lượt render hỏng → hoàn toàn phần; nhà cung cấp lỗi, video dựng Ken Burns cục
 * bộ, hoặc bên thật rẻ hơn bên đã tính → hoàn chênh (`videoRenderRefund`).
 */
async function settleVideoRenderCredit(
  ctx: TenantContext,
  videoJobId: string,
  genRepo = getGenerationJobRepository()
): Promise<void> {
  const gen = await genRepo.findLatestByPayload(ctx, "video.render", "videoJobId", videoJobId);
  if (!gen) return;
  if (lyDoHoanCredit(gen) !== null) {
    await refundJob(ctx, gen.id);
    return;
  }
  if (gen.status !== "COMPLETED") return;
  const plan = (gen.payload as { cost_plan?: { provider?: string | null; scenes?: number; credit?: number } } | null)?.cost_plan;
  const hoan = videoRenderRefund(plan, gen.output as { clip_provider?: string | null; provider_fallback?: boolean } | null);
  if (hoan > 0) await refundPartial(ctx, gen.id, "cloud-lui-cuc-bo", hoan);
}

const STORAGE_PREFIX = "/api/v1/storage/";

/**
 * URL ký có hạn để XEM video đã render (24/09/2026). Worker ghi
 * `final_video_url = /api/v1/storage/videos/<org>/<id>.mp4` KHÔNG kèm chữ ký,
 * nên trình duyệt không mở được và Khu vực E không có gì để xem. Chỉ ký khoá
 * nằm dưới `videos/<tổ chức của phiên>/` — không ký hộ tổ chức khác.
 */
export async function videoViewUrl(
  ctx: TenantContext,
  finalVideoUrl: string | null | undefined
): Promise<string | null> {
  if (!finalVideoUrl || !finalVideoUrl.startsWith(STORAGE_PREFIX)) return null;
  const key = finalVideoUrl.slice(STORAGE_PREFIX.length).split("?")[0]!;
  if (!key.startsWith(`videos/${ctx.organizationId}/`) || key.includes("..")) return null;
  return getStorageProvider().signedUrl(key, ASSET_VIEW_URL_TTL_SECONDS, "GET");
}
