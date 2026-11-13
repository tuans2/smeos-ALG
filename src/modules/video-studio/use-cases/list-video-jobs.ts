import { type TenantContext } from "@/core/tenancy";
import { requireCapability } from "@/core/rbac/capabilities";
import type { IVideoJobRepository } from "../domain/repositories/video-job-repository.interface";
import {
  getVideoJobRepository,
  type VideoJobWithScenes,
} from "../infra/video-job-repository";
import { video_format, video_stage } from "../infra/entities";

export class ListVideoJobsUseCase {
  constructor(private readonly repo: IVideoJobRepository = getVideoJobRepository()) {}

  async execute(
    ctx: TenantContext,
    options: {
      productId?: string | undefined;
      format?: video_format | undefined;
      stage?: video_stage | undefined;
      limit?: number | undefined;
    }
  ): Promise<VideoJobWithScenes[]> {
    requireCapability(ctx, "I1");
    return this.repo.list(ctx, options);
  }
}
