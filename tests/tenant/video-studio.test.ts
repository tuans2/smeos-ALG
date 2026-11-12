import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database";
import { createTenant, type Tenant } from "../helpers/fixtures";
import { CreateVideoJobUseCase } from "@/modules/video-studio/use-cases/create-video-job";
import { ListVideoJobsUseCase } from "@/modules/video-studio/use-cases/list-video-jobs";
import { GetVideoJobUseCase } from "@/modules/video-studio/use-cases/get-video-job";
import { UpdateStoryboardUseCase } from "@/modules/video-studio/use-cases/update-storyboard";
import { ApproveStoryboardUseCase } from "@/modules/video-studio/use-cases/approve-storyboard";
import { DispatchVideoRenderUseCase } from "@/modules/video-studio/use-cases/dispatch-video-render";
import { ApproveVideoOutputUseCase } from "@/modules/video-studio/use-cases/approve-video-output";
import { VideoJobRepository } from "@/modules/video-studio/infra/video-job-repository";
import { AssetRepository } from "@/modules/assets/infra/asset-repository";
import { randomUUID } from "node:crypto";

describe("Video Studio Tenant Isolation & Approval Lifecycle", () => {
  let tenantA: Tenant;
  let tenantB: Tenant;
  let repo: VideoJobRepository;

  beforeEach(async () => {
    await resetDatabase();
    tenantA = await createTenant("alpha");
    tenantB = await createTenant("beta");

    // Gán quyền Media + duyệt video cho cả 2 tenant (I1: media.optimize/create;
    // P3/P4: duyệt kịch bản/video — tách khỏi I2 ở RS-1 18/09).
    const caps = new Set(["I1", "I2", "P3", "P4"]);
    tenantA = {
      ...tenantA,
      ctx: { ...tenantA.ctx, capabilities: new Set([...tenantA.ctx.capabilities, ...caps]) },
    };
    tenantB = {
      ...tenantB,
      ctx: { ...tenantB.ctx, capabilities: new Set([...tenantB.ctx.capabilities, ...caps]) },
    };
    repo = new VideoJobRepository();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("tenant A cannot see tenant B's video jobs", async () => {
    const createUseCase = new CreateVideoJobUseCase();
    const listUseCase = new ListVideoJobsUseCase();

    // Tenant A tạo 1 job
    await createUseCase.execute(tenantA.ctx, {
      title: "Video Hoa Cưới Tenant A",
      format: "REEL_15S",
    });

    // Tenant B tạo 1 job
    await createUseCase.execute(tenantB.ctx, {
      title: "Video Khai Trương Tenant B",
      format: "TIKTOK_30S",
    });

    const jobsA = await listUseCase.execute(tenantA.ctx, {});
    const jobsB = await listUseCase.execute(tenantB.ctx, {});

    expect(jobsA).toHaveLength(1);
    expect(jobsA[0]?.title).toBe("Video Hoa Cưới Tenant A");
    expect(jobsA[0]?.organization_id).toBe(tenantA.ctx.organizationId);

    expect(jobsB).toHaveLength(1);
    expect(jobsB[0]?.title).toBe("Video Khai Trương Tenant B");
    expect(jobsB[0]?.organization_id).toBe(tenantB.ctx.organizationId);
  });

  it("tenant A cannot fetch or modify tenant B's video job storyboard", async () => {
    const createUseCase = new CreateVideoJobUseCase();
    const getUseCase = new GetVideoJobUseCase();
    const updateUseCase = new UpdateStoryboardUseCase();

    const jobB = await createUseCase.execute(tenantB.ctx, {
      title: "Video Bí Mật Tenant B",
      format: "REEL_15S",
    });

    // Tenant A cố truy cập job của Tenant B -> bị từ chối
    await expect(getUseCase.execute(tenantA.ctx, jobB.id)).rejects.toThrow("Không tìm thấy");

    // Tenant A cố sửa kịch bản của Tenant B -> bị từ chối
    await expect(
      updateUseCase.execute(tenantA.ctx, {
        jobId: jobB.id,
        scenes: [{ sceneIndex: 1, durationSeconds: 3.5, textOverlay: "Hacked" }],
      })
    ).rejects.toThrow("Không tìm thấy");
  });

  it("render lấp cảnh trống ảnh bằng ảnh storyboard gửi kèm — chỉ nhận ảnh của đúng tổ chức (24/09/2026)", async () => {
    const assets = new AssetRepository();
    const seed = async (t: Tenant) => {
      const id = randomUUID();
      await assets.create(t.ctx, {
        id,
        productId: null,
        parentAssetId: null,
        kind: "ORIGINAL",
        version: 1,
        storageKey: `org/${t.ctx.organizationId}/unfiled/${id}.png`,
        mimeType: "image/png",
        createdBy: t.ctx.userId,
      });
      return id;
    };
    const mine = await seed(tenantA);
    const theirs = await seed(tenantB);

    const job = await new CreateVideoJobUseCase().execute(tenantA.ctx, { title: "Lấp ảnh", format: "REEL_15S" });
    await new UpdateStoryboardUseCase().execute(tenantA.ctx, {
      jobId: job.id,
      scenes: [
        { sceneIndex: 1, durationSeconds: 5, textOverlay: "A" },
        { sceneIndex: 2, durationSeconds: 5, textOverlay: "B" },
      ],
    });
    await new ApproveStoryboardUseCase().execute(tenantA.ctx, job.id);
    const dispatch = new DispatchVideoRenderUseCase();

    // Ảnh của tổ chức khác không được dùng → cảnh 2 vẫn trống → chặn.
    await expect(
      dispatch.execute(tenantA.ctx, job.id, {
        sceneImages: [
          { sceneIndex: 1, assetId: mine },
          { sceneIndex: 2, assetId: theirs },
        ],
      })
    ).rejects.toThrow("#2");

    const ok = await dispatch.execute(tenantA.ctx, job.id, { sceneImages: [{ sceneIndex: 2, assetId: mine }] });
    expect(ok.videoJob.stage).toBe("RENDERING");
    const after = await repo.findById(tenantA.ctx, job.id);
    expect(after?.scenes.every((s) => s.image_asset_id === mine)).toBe(true);
  });

  it("enforces two-stage approval gate lifecycle", async () => {
    const createUseCase = new CreateVideoJobUseCase();
    const updateUseCase = new UpdateStoryboardUseCase();
    const approveScriptUseCase = new ApproveStoryboardUseCase();
    const dispatchRenderUseCase = new DispatchVideoRenderUseCase();
    const approveVideoUseCase = new ApproveVideoOutputUseCase();

    // 1. Tạo video job
    const job = await createUseCase.execute(tenantA.ctx, {
      title: "Quy trình kiểm định 2 cổng duyệt",
      format: "REEL_15S",
    });
    expect(job.stage).toBe("DRAFT");
    expect(job.script_approval).toBe("PENDING");
    expect(job.video_approval).toBe("PENDING");

    // 2. Chỉnh sửa kịch bản phân cảnh (3 cảnh = 12 giây, hợp lệ với REEL_15S)
    const updated = await updateUseCase.execute(tenantA.ctx, {
      jobId: job.id,
      scenes: [
        { sceneIndex: 1, durationSeconds: 4, textOverlay: "Mở đầu hoa tươi", imageAssetId: "org/test/scene-1.png" },
        { sceneIndex: 2, durationSeconds: 4, textOverlay: "Chi tiết cánh hoa", imageAssetId: "org/test/scene-2.png" },
        { sceneIndex: 3, durationSeconds: 4, textOverlay: "Đặt ngay hôm nay", imageAssetId: "org/test/scene-3.png" },
      ],
    });
    expect(updated.stage).toBe("SCRIPT_READY");
    expect(updated.scenes).toHaveLength(3);

    // 3. Cố tình kích hoạt Render khi chưa duyệt Kịch bản (Cổng 1) -> BỊ CHẶN
    await expect(dispatchRenderUseCase.execute(tenantA.ctx, job.id)).rejects.toThrow(
      "Bắt buộc phải phê duyệt Kịch bản"
    );

    // 4. Phê duyệt Kịch bản (Cổng 1)
    const approvedScript = await approveScriptUseCase.execute(tenantA.ctx, job.id);
    expect(approvedScript.script_approval).toBe("APPROVED");
    expect(approvedScript.stage).toBe("SCRIPT_APPROVED");

    // 5. Kích hoạt Render sau khi Cổng 1 đã duyệt -> THÀNH CÔNG
    const dispatched = await dispatchRenderUseCase.execute(tenantA.ctx, job.id);
    expect(dispatched.videoJob.stage).toBe("RENDERING");
    expect(dispatched.generationJobId).toBeDefined();

    // 6. Mô phỏng worker render hoàn tất
    await repo.updateStage(tenantA.ctx, job.id, "RENDER_COMPLETED", {
      finalVideoUrl: "https://storage.avilotusgroup.com/org/test/video.mp4",
    });

    // 7. Phê duyệt Video thành phẩm (Cổng 2) -> THÀNH CÔNG
    const approvedVideo = await approveVideoUseCase.execute(tenantA.ctx, job.id);
    expect(approvedVideo.video_approval).toBe("APPROVED");
    expect(approvedVideo.stage).toBe("APPROVED");
    expect(approvedVideo.final_asset_id).toBeDefined();
  });

  // PO 25/09/2026: nhà cung cấp trước; giá theo bên đứng đầu; hoàn chênh khi lùi cục bộ.
  it("render: thứ tự nhà cung cấp vào payload, thu theo bên đứng đầu, lùi Ken Burns thì hoàn phần clip lúc đọc", async () => {
    const ws = await prisma.workspaces.create({ data: { organization_id: tenantA.organizationId, name: "Sản xuất", kind: "PRODUCTION" } });
    await prisma.organizations.update({ where: { id: tenantA.organizationId }, data: { credit_balance: 100 } });
    const ctx = { ...tenantA.ctx, workspaceId: ws.id };
    const job = await new CreateVideoJobUseCase().execute(ctx, { title: "Clip nhà cung cấp", format: "REEL_15S" });
    await new UpdateStoryboardUseCase().execute(ctx, {
      jobId: job.id,
      scenes: [
        { sceneIndex: 1, durationSeconds: 4, textOverlay: "A", imageAssetId: "org/x/1.png" },
        { sceneIndex: 2, durationSeconds: 4, textOverlay: "B", imageAssetId: "org/x/2.png" },
        { sceneIndex: 3, durationSeconds: 4, textOverlay: "C", imageAssetId: "org/x/3.png" },
      ],
    });
    await new ApproveStoryboardUseCase().execute(ctx, job.id);
    const r = await new DispatchVideoRenderUseCase().execute(ctx, job.id, { videoProvider: "kling" });

    const gen = await prisma.generation_jobs.findUniqueOrThrow({ where: { id: r.generationJobId } });
    const payload = gen.payload as { provider_order: string[]; cost_plan: { credit: number } };
    expect(payload.provider_order).toEqual(["kling", "veo", "runway", "luma"]);
    expect(payload.cost_plan.credit).toBe(5 + 5 * 3);
    expect((await prisma.organizations.findUniqueOrThrow({ where: { id: tenantA.organizationId } })).credit_balance).toBe(80);

    // Worker: mọi nhà cung cấp lỗi → Ken Burns cục bộ.
    await prisma.generation_jobs.update({
      where: { id: gen.id },
      data: { status: "COMPLETED", output: { provider_fallback: true, provider_fallback_reason: "FAL_KEY thiếu" } },
    });
    await new GetVideoJobUseCase().execute(ctx, job.id);
    await new GetVideoJobUseCase().execute(ctx, job.id);
    expect((await prisma.organizations.findUniqueOrThrow({ where: { id: tenantA.organizationId } })).credit_balance).toBe(95);

    // Tổ chức khác đọc không hoàn gì hộ.
    await expect(new GetVideoJobUseCase().execute(tenantB.ctx, job.id)).rejects.toThrow();
  });

  it("render Ken Burns cục bộ đích danh: không thứ tự nhà cung cấp, chỉ tính phí ghép", async () => {
    const job = await new CreateVideoJobUseCase().execute(tenantA.ctx, { title: "Cục bộ", format: "REEL_15S" });
    await new UpdateStoryboardUseCase().execute(tenantA.ctx, {
      jobId: job.id,
      scenes: [
        { sceneIndex: 1, durationSeconds: 6, textOverlay: "A", imageAssetId: "org/x/1.png" },
        { sceneIndex: 2, durationSeconds: 6, textOverlay: "B", imageAssetId: "org/x/2.png" },
      ],
    });
    await new ApproveStoryboardUseCase().execute(tenantA.ctx, job.id);
    const r = await new DispatchVideoRenderUseCase().execute(tenantA.ctx, job.id, { videoProvider: "local_cinematic" });
    const gen = await prisma.generation_jobs.findUniqueOrThrow({ where: { id: r.generationJobId } });
    expect((gen.payload as { provider_order: string[]; cost_plan: { credit: number } }).provider_order).toEqual([]);
    expect((gen.payload as { cost_plan: { credit: number } }).cost_plan.credit).toBe(5);
  });
});
