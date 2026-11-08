import type { TenantContext } from "@/core/tenancy"
import { inBranchScope } from "@/core/tenancy"
import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { contentLockedReason, toContentFlags, type ContentFlagsWire } from "@/modules/content-studio/domain/content-journey"
import { readSalesPitch, salesPitchTooLarge, withSalesPitch, type SalesPitchRecord, type StoredSalesPitch } from "@/modules/products/domain/sales-pitch-record"
import { getProductRepository } from "@/modules/products/infra/product-repository"
import { getAnalysis } from "@/modules/products/use-cases/get-analysis"
import { listProducts } from "@/modules/products/use-cases/list-products"
import { updateProduct } from "@/modules/products/use-cases/update-product"
import { getContentStudioRepository, type ContentStudioRepository } from "../infra/content-studio-repository"

type Json = Record<string, unknown>

export interface ContentProductView {
  readonly product: { id: string; name: string; code: string; status: string }
  readonly analysis: { id: string; approval_state: string; image_url: string | null; data: Json } | null
  readonly copy: { id: string; approval_state: string; data: Json } | null
  readonly sales_pitch: StoredSalesPitch | null
  readonly flags: ContentFlagsWire
}

async function loadProduct(ctx: TenantContext, productId: string) {
  const product = await getProductRepository().findById(ctx, productId)
  // Sản phẩm tổ chức khác / chi nhánh khác → như không tồn tại (404, không 403)
  if (!product || (product.branch_id && !inBranchScope(ctx, product.branch_id))) throw notFound()
  return product
}

/**
 * Mọi dữ liệu đã có của "sản phẩm đang làm" trong hành trình Tạo nội dung (L1): Thẻ sản phẩm (bản quét ảnh),
 * Bài giới thiệu, Thẻ chào đã lưu và cờ duyệt của từng bước. Một lần gọi thay cho bốn — giao diện không tự ghép.
 */
export async function getContentProduct(
  ctx: TenantContext,
  productId: string,
  repo: ContentStudioRepository = getContentStudioRepository(),
): Promise<ContentProductView> {
  const product = await loadProduct(ctx, productId)
  const [analysisRow, copyRow, approvedPosts] = await Promise.all([
    repo.latestAnalysis(ctx, productId),
    repo.latestCopy(ctx, productId),
    repo.countApprovedPosts(ctx, productId),
  ])
  const analysis = analysisRow ? await getAnalysis(ctx, analysisRow.id) : null
  const salesPitch = readSalesPitch(product.attributes)

  return {
    product: { id: product.id, name: product.name, code: product.code, status: product.status },
    analysis: analysis
      ? { id: analysis.id, approval_state: analysis.approval_state, image_url: analysis.image_url, data: analysis.edited ?? analysis.raw }
      : null,
    copy: copyRow
      ? { id: copyRow.id, approval_state: copyRow.approval_state, data: { ...((copyRow.raw as Json | null) ?? {}), ...((copyRow.edited as Json | null) ?? {}) } }
      : null,
    sales_pitch: salesPitch,
    flags: {
      card_approved: analysis?.approval_state === "APPROVED",
      copy_approved: copyRow?.approval_state === "APPROVED",
      pitch_saved: salesPitch !== null,
      approved_posts: approvedPosts,
    },
  }
}

export interface ContentLibraryItem {
  readonly id: string
  readonly name: string
  readonly code: string
  readonly status: string
  readonly image_url: string | null
  readonly has_copy: boolean
  readonly has_pitch: boolean
}

/** Kho sản phẩm cho hành trình (L1): dùng lại `listProducts` (phạm vi chi nhánh, che giá) + cờ đã có gì. */
export async function listContentLibrary(
  ctx: TenantContext,
  options: { limit: number; cursor?: string | undefined },
  repo: ContentStudioRepository = getContentStudioRepository(),
): Promise<{ data: ContentLibraryItem[]; next_cursor: string | null }> {
  const page = await listProducts(ctx, {}, { limit: options.limit, cursor: options.cursor ?? null })
  const withCopy = await repo.productsWithApprovedCopy(ctx, page.data.map((p) => p.id))
  return {
    data: page.data.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      status: p.status,
      image_url: p.masterImageUrl ?? null,
      has_copy: withCopy.has(p.id),
      has_pitch: readSalesPitch(p.attributes) !== null,
    })),
    next_cursor: page.next_cursor,
  }
}

/**
 * Chốt Thẻ chào sản phẩm và lưu vào Kho sản phẩm (L3) — `products.attributes.sales_pitch`, giữ nguyên mọi khoá
 * khác. Máy chủ tự kiểm khoá bước: Thẻ sản phẩm + Bài giới thiệu phải đã duyệt. Ghi qua `updateProduct` nên
 * luật mẫu chính thức (chỉ Điều hành sửa) và lưu phiên bản trước vẫn áp dụng.
 */
export async function saveSalesPitch(
  ctx: TenantContext,
  productId: string,
  pitch: SalesPitchRecord,
  repo: ContentStudioRepository = getContentStudioRepository(),
): Promise<StoredSalesPitch> {
  if (salesPitchTooLarge(pitch)) throw validationFailed({ pitch: "Thẻ chào quá dài — rút gọn mô tả hoặc danh sách" })
  const view = await getContentProduct(ctx, productId, repo)
  const locked = contentLockedReason("SALES_PITCH", toContentFlags(view.flags))
  if (locked) throw conflict(locked)

  const current = await loadProduct(ctx, productId)
  const attributes = withSalesPitch((current.attributes as Json | null) ?? null, pitch, { userId: ctx.userId, at: new Date() })
  const updated = await updateProduct(ctx, productId, { attributes })
  const saved = readSalesPitch(updated.attributes)
  if (!saved) throw conflict("Chưa lưu được Thẻ chào — thử lại")

  await recordAuditLog(ctx, {
    action: "product.sales_pitch.finalize",
    entityType: "products",
    entityId: productId,
    before: { version: view.sales_pitch?.version ?? null },
    after: { version: saved.version, product_name: pitch.product_name },
  })
  return saved
}
