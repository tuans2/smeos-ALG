import { AppError, conflict, notFound } from "@/core/http/errors"
import { hasCapability } from "@/core/rbac/capabilities"
import { canAssignBranch, type TenantContext } from "@/core/tenancy"
import type { IProductRepository, UpdateProductInput } from "@/modules/products/domain/repositories/product-repository.interface"
import { getProductRepository } from "@/modules/products/infra/product-repository"
import { PRICING_ONLY_ATTRIBUTE_KEYS } from "@/modules/products/domain/product-lookup"
import { decideEdit, PROPOSAL_KEY, stripProposal } from "@/modules/products/domain/product-proposal"
import { saveRevision } from "./product-revisions"

/**
 * `PATCH /products/:id` (`L3`, đặc tả 06 mục 6). Sửa tay thông tin sản phẩm
 * — tách khỏi luồng duyệt phân tích ảnh (`H3`, ghi cả bốn trường nhận dạng
 * cùng lúc qua `updateIdentity`).
 */
export async function updateProduct(
  ctx: TenantContext,
  id: string,
  input: UpdateProductInput,
  repo: IProductRepository = getProductRepository()
) {
  const current = await repo.findById(ctx, id) // đã lọc theo chi nhánh (T-5b)
  if (!current) throw notFound()
  // Không chuyển mẫu sang chi nhánh khác khi đang bị giới hạn theo chi nhánh (ADR-012 T-5b)
  if (input.branchId !== undefined && !canAssignBranch(ctx, "L3", input.branchId, { allowShared: true })) throw notFound()
  const stored = (current.attributes as Record<string, unknown> | null) ?? {}

  // Mẫu chính thức: chỉ Điều hành (`H3`) sửa nội dung — xem `product-proposal.ts`.
  const decision = decideEdit({
    canManageCatalog: hasCapability(ctx, "H3"),
    userId: ctx.userId,
    storedAttributes: stored,
    input: input as Record<string, unknown>,
  })
  if (decision === "deny") {
    throw new AppError(
      "CAPABILITY_DENIED",
      "Chỉ Điều hành sửa được mẫu chính thức. Hãy dùng “Lưu thành mẫu mới” để đề xuất một bản khác."
    )
  }

  // Nhãn đề xuất chỉ máy chủ ghi: bỏ giá trị client gửi, giữ giá trị đang lưu.
  if (input.attributes) {
    const incoming = stripProposal(input.attributes)
    input = { ...input, attributes: PROPOSAL_KEY in stored ? { ...incoming, [PROPOSAL_KEY]: stored[PROPOSAL_KEY] } : incoming }
  }

  if (input.code !== undefined) {
    const existing = await repo.findByCode(ctx, input.code)
    if (existing && existing.id !== id) {
      throw conflict(`Mã sản phẩm "${input.code}" đã tồn tại trong tổ chức`)
    }
  }

  // Người không có L5 chưa từng thấy BOM/giá sàn-trần (bị lọc khi đọc) → gửi `attributes` thiếu các khoá
  // đó không có nghĩa là xoá: giữ nguyên giá trị đang lưu, và không cho họ ghi đè.
  if (input.attributes && !hasCapability(ctx, "L5")) {
    const kept = Object.fromEntries(PRICING_ONLY_ATTRIBUTE_KEYS.filter((k) => k in stored).map((k) => [k, stored[k]]))
    const incoming = Object.fromEntries(
      Object.entries(input.attributes).filter(([k]) => !(PRICING_ONLY_ATTRIBUTE_KEYS as readonly string[]).includes(k))
    )
    input = { ...input, attributes: { ...incoming, ...kept } }
  }

  // Điều hành đổi nội dung (không chỉ tạm ẩn / khả dụng) → lưu phiên bản trước để khôi phục được.
  const changesContent = Object.entries(input).some(([k, v]) => v !== undefined && k !== "status" && k !== "availabilityConfig")
  if (changesContent && hasCapability(ctx, "H3")) await saveRevision(ctx, current as unknown as import("@/modules/products/infra/entities").products, "EDIT")

  const updated = await repo.update(ctx, id, input)
  if (!updated) throw notFound()
  return updated
}
