/**
 * Batch Job Creation API — POST /api/v1/jobs/batch
 * 
 * Tạo job cho một module cụ thể với danh sách capabilities được chọn.
 * Endpoint này được gọi từ FeaturePicker khi user bấm "Tạo tác vụ".
 * 
 * Body:
 * {
 *   product_id: string,
 *   master_image_id?: string,
 *   feature: string,           // job feature string (vision.analyze, creative.compose, etc.)
 *   capabilities: string[],    // AIC codes: ["AIC-11", "AIC-12", ...]
 *   module: string             // M01, M01b, M04a, M04b, M04c, M07, M09, M06, M05
 * }
 * 
 * Response 202:
 * { job_id: string, status: JobStatus, usage: { cost_credit: number, balance_after: number } }
 */

import { jsonResponse } from "@/core/http/response";
import { defineRoute } from "@/core/http/define-route";
import type { TenantContext } from "@/core/tenancy";
import { AppError, validationFailed } from "@/core/http/errors";
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency";
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job";
import { getJobFeatureForModule, type ModuleKey } from "@/lib/feature-catalog";
import { jobBatchBody } from "@/app/api/v1/_contracts/requests-ai-studio";
import { camelKeys } from "@/lib/case-keys"

const MODULE_RUN_CAPABILITY: Record<string, string> = {
  M01: "H1",
  M01b: "H5",
  M04a: "I1",
  M04b: "P1",
  M04c: "P3",
  M07: "O1",
  M09: "Q3",
  M06: "J1",
  M05: "L1",
};

// Audit API-05: trước đây thân chỉ ép kiểu, mảng `capabilities` không giới hạn.

async function batchJobHandler({ request, ctx }: { request: Request; ctx: TenantContext }) {

  const parsed = jobBatchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues });
  const input = camelKeys(parsed.data)
  const { productId, masterImageId, feature, capabilities, module } = input;

  // YC-U7: khoá do client gửi — tự sinh UUID khi thiếu (bản trước) làm mỗi lần bấm lại là một job
  // mới, trừ credit hai lần. Kiểm trước khi tạo job, cùng cách `media/optimizations`.
  const idempotencyKey = readIdempotencyKey(request);
  if (!idempotencyKey) {
    throw validationFailed({ "idempotency-key": "Bắt buộc trên mọi endpoint tạo job (YC-U7)" });
  }

  // Validate module -> feature mapping matches
  const expectedFeature = getJobFeatureForModule(module as ModuleKey);
  if (feature !== expectedFeature) {
    throw new AppError("VALIDATION_FAILED", `Feature không khớp module: kỳ vọng ${expectedFeature}, nhận ${feature}`);
  }

  // Check RBAC run capability for this module.
  // RS-8 18/09: trước đợt soát, `module` ngoài 9 khoá của bảng này (ví dụ
  // M03/M08/M11 — chưa có mã quyền "run" chính thức trong đặc tả) khiến
  // `requiredRunCap` là `undefined` và điều kiện `if` bên dưới bị bỏ qua
  // hoàn toàn — TRÔI QUA không gác quyền gì. Đóng theo kiểu "mặc định từ
  // chối": module không có trong bảng thì chặn thẳng, không cho lọt.
  const requiredRunCap = MODULE_RUN_CAPABILITY[module];
  if (!requiredRunCap) {
    throw new AppError("CAPABILITY_DENIED", `Module ${module} chưa có quyền "run" khai báo — chặn theo mặc định`);
  }
  if (!ctx.capabilities.has(requiredRunCap)) {
    throw new AppError("CAPABILITY_DENIED", `Thiếu quyền ${requiredRunCap} để chạy module ${module}`);
  }

  // Build payload for job
  const payload: Record<string, unknown> = {
    productId,
    capabilities, // AIC codes for worker to process
  };
  if (masterImageId) payload.masterImageId = masterImageId;

  // Enqueue job (quota check + usage write + job create + NOTIFY in 1 TX)
  const result = await enqueueJob(ctx, {
    feature,
    payload,
    productId,
    idempotencyKey,
  });

  // 202: job đã nhận, worker chạy sau (đặc tả 06 luật 4, audit API-16, PO 09/11/2026); thân giữ nguyên cho FeaturePicker.
  return jsonResponse(
    {
      job_id: result.job.id,
      status: result.job.status,
      usage: {
        cost_credit: result.usage.costCredit,
        balance_after: result.usage.balanceAfter,
      },
    },
    { status: 202 }
  );
}

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền chạy theo module kiểm trong handler (ctx.capabilities, bảng mã theo module)" },
  handler: batchJobHandler,
});

export const dynamic = "force-dynamic" as const;
export const revalidate = 0 as const;