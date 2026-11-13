import { createContentLLM } from "@/core/ai/adapters/multi-llm-provider"
import { callCapability } from "@/core/ai/gateway"
import { aiGatewayDeps } from "@/core/ai/wiring"
import { log } from "@/core/observability/log"
import type { TenantContext } from "@/core/tenancy"
import { safeRemoteUrl } from "@/lib/safe-remote-url"

import {
  createPhotoMatchVisionAdapter,
  type PhotoMatchRequest,
  type PhotoMatchVerdict,
} from "../adapters/photo-match-vision-adapter"

const IMAGE_FETCH_TIMEOUT_MS = 6000
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

/** Ảnh mẫu / ảnh QC (URL ký của kho hoặc data URI) → base64 để gửi mô hình; lỗi thì bỏ qua ảnh đó. */
export async function loadImageForAi(url: string | null | undefined): Promise<{ mimeType: string; base64: string } | null> {
  if (!url) return null
  const dataUri = /^data:([^;]+);base64,(.+)$/.exec(url)
  if (dataUri) return { mimeType: dataUri[1]!, base64: dataUri[2]! }
  // URL ảnh mẫu có thể do tiệm nhập (`attributes.imageUrl`): chỉ https công khai, không theo chuyển
  // hướng, tối đa 8 MB — trước 22/10/2026 máy chủ tải mọi URL http(s), kể cả địa chỉ nội bộ (rà soát cụm H)
  const safe = safeRemoteUrl(url)
  if (!safe) return null
  try {
    const res = await fetch(safe, { signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS), redirect: "error" })
    if (!res.ok) return null
    const mimeType = res.headers.get("content-type") || "image/jpeg"
    if (!mimeType.startsWith("image/")) return null
    if (Number(res.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.length > MAX_IMAGE_BYTES) return null
    return { mimeType, base64: bytes.toString("base64") }
  } catch {
    return null
  }
}

/**
 * Đối chiếu ảnh bằng AI qua gateway (`callCapability`, luật bất khả xâm phạm số 5): có sổ chi
 * phí, sàn quyền riêng tư và lọc giấy phép mô hình. Mọi lỗi — thiếu khoá, hết đường dự phòng,
 * mô hình trả sai định dạng — đều về `UNCERTAIN` (isMatch=false) để Điều phối duyệt tay, KHÔNG
 * bao giờ tự cho qua (rà soát 21/10/2026, H6: bản trước gọi thẳng OpenAI và trả MATCH khi lỗi).
 */
export async function runPhotoMatch(input: {
  organizationId: string
  entity: { type: string; id: string }
  request: PhotoMatchRequest
  logKey: string
  uncertainReason: string
}): Promise<PhotoMatchVerdict> {
  const uncertain: PhotoMatchVerdict = { isMatch: false, confidenceScore: 0, verdict: "UNCERTAIN", reason: input.uncertainReason }
  const ctx: TenantContext = {
    organizationId: input.organizationId,
    workspaceId: input.organizationId,
    userId: "system",
    branchId: null,
    capabilities: new Set(["ai.generate"]),
  }
  try {
    const result = await callCapability(
      // Ảnh sản phẩm/giao hàng của chính tiệm — mức SHOP, ghim mô hình đọc ảnh như đọc bill (PO 14/10)
      { capability: "content_generation", privacy: "SHOP", pinnedModelKey: "openai_structured", entity: input.entity },
      createPhotoMatchVisionAdapter(createContentLLM(), input.request, input.organizationId),
      aiGatewayDeps(ctx)
    )
    if (result.kind !== "xong") {
      log.warn(`${input.logKey}.not_done`, { organizationId: input.organizationId, kind: result.kind })
      return uncertain
    }
    log.info(`${input.logKey}.completed`, { organizationId: input.organizationId, isMatch: result.output.isMatch, confidenceScore: result.output.confidenceScore })
    return result.output
  } catch (error) {
    log.warn(`${input.logKey}.failed`, { organizationId: input.organizationId, error: error instanceof Error ? error.message : String(error) })
    return uncertain
  }
}
