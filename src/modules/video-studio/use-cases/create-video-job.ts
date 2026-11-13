import { type TenantContext } from "@/core/tenancy";
import { requireCapability } from "@/core/rbac/capabilities";
import type { IVideoJobRepository } from "../domain/repositories/video-job-repository.interface";
import {
  getVideoJobRepository,
  type VideoJobWithScenes,
} from "../infra/video-job-repository";
import {
  VideoFormat,
  VIDEO_FORMAT_SPECS,
  VideoSceneItem,
  CaptionStyle,
} from "../domain/video-types";
import { normalizeScenes } from "../domain/video-storyboard";
import { calculateVideoCreditCost } from "../domain/video-pricing-guard";

export interface CreateVideoJobUseCaseInput {
  productId?: string | null | undefined;
  title: string;
  format: VideoFormat;
  aspectRatio?: string | undefined;
  musicTrack?: string | null | undefined;
  voiceCode?: string | null | undefined;
  hasSubtitle?: boolean | undefined;
  captionStyle?: CaptionStyle | undefined;
  hasWatermark?: boolean | undefined;
  scenes?: VideoSceneItem[] | undefined;
}

export class CreateVideoJobUseCase {
  constructor(private readonly repo: IVideoJobRepository = getVideoJobRepository()) {}

  async execute(
    ctx: TenantContext,
    input: CreateVideoJobUseCaseInput
  ): Promise<VideoJobWithScenes> {
    // 1. Kiểm tra quyền thao tác sáng tạo nội dung đa phương tiện
    requireCapability(ctx, "I1");

    const spec = VIDEO_FORMAT_SPECS[input.format];
    if (!spec) {
      throw new Error(`Khuôn video không hỗ trợ: ${input.format}`);
    }

    const durationSeconds = spec.targetDurationSeconds;
    const cost = calculateVideoCreditCost({
      format: input.format,
      durationSeconds,
      hasAiVoice: Boolean(input.voiceCode),
      isSlideshowLocal: input.format === "SLIDESHOW",
    });

    const isLongFormat = durationSeconds >= 25;
    // 24/09/2026: bỏ ảnh mẫu Unsplash — cảnh mặc định KHÔNG có ảnh; người dùng
    // gắn ảnh sản phẩm thật (Khu vực D / Master Image) trước khi render.

    const perSceneDuration = Math.round((durationSeconds / 3) * 10) / 10;
    const defaultScenes: VideoSceneItem[] = isLongFormat
      ? [
          {
            sceneIndex: 1,
            durationSeconds: 6,
            imageAssetId: null,
            textOverlay: "Mỗi đóa hoa được chọn lựa thủ công từ sáng sớm",
            voiceScript: "Mỗi đóa hoa được chọn lựa thủ công từ sáng sớm",
            transitionEffect: "fade",
            motionEffect: "ZOOM_IN",
          },
          {
            sceneIndex: 2,
            durationSeconds: 6,
            imageAssetId: null,
            textOverlay: "Từng cành sản phẩm qua bàn tay nghệ nhân",
            voiceScript: "Từng cành sản phẩm qua bàn tay nghệ nhân",
            transitionEffect: "slide_left",
            motionEffect: "PAN_RIGHT",
          },
          {
            sceneIndex: 3,
            durationSeconds: 6,
            imageAssetId: null,
            textOverlay: "Thiết kế sang trọng phù hợp mọi dịp kỷ niệm",
            voiceScript: "Thiết kế sang trọng phù hợp mọi dịp kỷ niệm",
            transitionEffect: "fade",
            motionEffect: "ZOOM_OUT",
          },
          {
            sceneIndex: 4,
            durationSeconds: 6,
            imageAssetId: null,
            textOverlay: "Tặng kèm thiệp viết tay và phụ kiện cao cấp",
            voiceScript: "Tặng kèm thiệp viết tay và phụ kiện cao cấp",
            transitionEffect: "slide_left",
            motionEffect: "PAN_UP",
          },
          {
            sceneIndex: 5,
            durationSeconds: 6,
            imageAssetId: null,
            textOverlay: "Giao tận tay trong 2 giờ kèm thiệp chúc mừng",
            voiceScript: "Giao tận tay trong 2 giờ kèm thiệp chúc mừng",
            transitionEffect: "fade",
            motionEffect: "ZOOM_IN",
          },
        ]
      : [
          {
            sceneIndex: 1,
            durationSeconds: perSceneDuration,
            imageAssetId: null,
            textOverlay: "Mỗi đóa hoa được chọn lựa thủ công từ sáng sớm",
            voiceScript: "Mỗi đóa hoa được chọn lựa thủ công từ sáng sớm",
            transitionEffect: "fade",
            motionEffect: "ZOOM_IN",
          },
          {
            sceneIndex: 2,
            durationSeconds: perSceneDuration,
            imageAssetId: null,
            textOverlay: "Thiết kế sang trọng phù hợp mọi dịp kỷ niệm",
            voiceScript: "Thiết kế sang trọng phù hợp mọi dịp kỷ niệm",
            transitionEffect: "slide_left",
            motionEffect: "PAN_RIGHT",
          },
          {
            sceneIndex: 3,
            durationSeconds: Math.max(2, durationSeconds - (perSceneDuration * 2)),
            imageAssetId: null,
            textOverlay: "Giao tận tay trong 2 giờ kèm thiệp chúc mừng",
            voiceScript: "Giao tận tay trong 2 giờ kèm thiệp chúc mừng",
            transitionEffect: "fade",
            motionEffect: "ZOOM_OUT",
          },
        ];

    const scenes = normalizeScenes(
      input.scenes && input.scenes.length > 0 ? input.scenes : defaultScenes
    );

    return this.repo.create(ctx, {
      productId: input.productId ?? null,
      title: input.title.trim() || `Video ${spec.label}`,
      format: input.format,
      durationSeconds,
      aspectRatio: input.aspectRatio ?? spec.aspectRatio,
      musicTrack: input.musicTrack ?? null,
      voiceCode: input.voiceCode ?? null,
      hasSubtitle: input.hasSubtitle ?? true,
      captionStyle: input.captionStyle ?? "MODERN_BADGE",
      hasWatermark: input.hasWatermark ?? false,
      costCredits: cost.totalCredits,
      scenes,
    });
  }
}
