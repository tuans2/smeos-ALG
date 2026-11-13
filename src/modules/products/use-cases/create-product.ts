import { randomUUID } from "node:crypto"

import { conflict, notFound } from "@/core/http/errors"
import { hasCapability } from "@/core/rbac/capabilities"
import { canAssignBranch, type TenantContext } from "@/core/tenancy"
import { draftProductCode } from "@/modules/products/domain/product-code"
import { newProposal, PROPOSAL_KEY, stripProposal } from "@/modules/products/domain/product-proposal"
import type { IProductRepository, CreateProductInput } from "@/modules/products/domain/repositories/product-repository.interface"
import { getProductRepository } from "@/modules/products/infra/product-repository"

/**
 * `POST /products` (`L2`, đặc tả 06 mục 6). `products` có
 * `@@unique([organization_id, code])` — kiểm trước khi ghi để trả 409 với
 * câu rõ nghĩa thay vì để lỗi ràng buộc cơ sở dữ liệu (`P2002`) lộ ra ngoài.
 * Còn một khe hẹp đua giữa kiểm và ghi (cùng dạng đã chấp nhận ở
 * `sign-up.ts` cho email/slug) — mức rủi ro chấp nhận được cho một thao tác
 * do người thao tác tay, không phải job chạy hàng loạt.
 */
export async function createProduct(
  ctx: TenantContext,
  input: CreateProductInput,
  repo: IProductRepository = getProductRepository()
) {
  // Nhân viên bị giới hạn theo chi nhánh chỉ tạo mẫu cho chi nhánh mình hoặc dùng chung (ALG 9.13, ADR-012 T-5b)
  if (!canAssignBranch(ctx, "L2", input.branchId, { allowShared: true })) throw notFound()

  // Mã để trống → tự sinh theo quy ước `product-code.ts`, thử lại khi trùng (tối đa 5 lần, checklist ALG 2.1)
  let code = input.code.trim()
  if (!code) {
    for (let attempt = 0; attempt < 5 && !code; attempt++) {
      const candidate = draftProductCode(randomUUID())
      if (!(await repo.findByCode(ctx, candidate))) code = candidate
    }
    if (!code) throw conflict("Không tạo được mã sản phẩm tự động — vui lòng nhập mã")
  } else if (await repo.findByCode(ctx, code)) {
    throw conflict(`Mã sản phẩm "${code}" đã tồn tại trong tổ chức`)
  }

  // Người không có H3 (duyệt vào danh mục) tạo mẫu → dùng được ngay nhưng mang
  // nhãn đề xuất chờ Điều hành duyệt (`product-proposal.ts`).
  const isProposal = !hasCapability(ctx, "H3")
  const attributes = stripProposal(input.attributes) ?? null
  return repo.create(ctx, {
    ...input,
    code,
    attributes: isProposal ? { ...(attributes ?? {}), [PROPOSAL_KEY]: newProposal(ctx.userId) } : attributes,
  })
}
