/**
 * Universal Catalog Studio 2026 — Pure Domain Catalog Validator.
 * Pure TypeScript — Zero ORM.
 */

import type {
  CatalogBrief,
  CatalogProductItem,
  ValidationIssue,
} from "../entities/catalog-studio.types"

export function validateCatalogBrief(
  brief: CatalogBrief,
  products: CatalogProductItem[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!brief.title || brief.title.trim().length === 0) {
    issues.push({
      severity: "BLOCKING",
      code: "EMPTY_CATALOG_TITLE",
      message: "Tên catalog / bộ sưu tập không được để trống.",
      suggestedFix: "Nhập tên bộ sưu tập rõ ràng, hấp dẫn.",
    })
  }

  if (products.length === 0) {
    issues.push({
      severity: "BLOCKING",
      code: "NO_PRODUCTS_SELECTED",
      message: "Catalog phải có ít nhất 1 sản phẩm.",
      suggestedFix: "Chọn ít nhất một sản phẩm từ kho.",
    })
    return issues
  }

  // Validate each product
  products.forEach((prod, idx) => {
    if (!prod.name || prod.name.trim().length === 0) {
      issues.push({
        severity: "BLOCKING",
        code: "EMPTY_PRODUCT_NAME",
        message: `Sản phẩm thứ ${idx + 1} (mã: ${prod.code || prod.productId}) chưa có tên.`,
        entityId: prod.productId,
        suggestedFix: "Bổ sung tên sản phẩm trước khi xuất bản.",
      })
    } else if (prod.name.length > 50) {
      issues.push({
        severity: "WARNING",
        code: "LONG_PRODUCT_NAME",
        message: `Tên sản phẩm "${prod.name.slice(0, 30)}..." khá dài (${prod.name.length} ký tự).`,
        entityId: prod.productId,
        suggestedFix: "Rút gọn tên để bố cục in ấn và hiển thị đẹp mắt hơn.",
      })
    }

    if (!prod.primaryImage) {
      issues.push({
        severity: "WARNING",
        code: "MISSING_PRIMARY_IMAGE",
        message: `Sản phẩm "${prod.name}" chưa có ảnh chính đại diện.`,
        entityId: prod.productId,
        suggestedFix: "Tải ảnh sản phẩm lên để catalog đạt thẩm mỹ cao nhất.",
      })
    }

    if (prod.price == null || prod.price === 0) {
      issues.push({
        severity: "SUGGESTION",
        code: "UNSPECIFIED_PRICE",
        message: `Sản phẩm "${prod.name}" chưa có giá niêm yết (sẽ hiển thị "Liên hệ").`,
        entityId: prod.productId,
        suggestedFix: "Điền giá bán nếu muốn khách hàng đặt hàng tức thì.",
      })
    }
  })

  // Odd product count notice
  if (products.length > 1 && products.length % 2 !== 0) {
    issues.push({
      severity: "SUGGESTION",
      code: "ODD_PRODUCT_COUNT",
      message: `Bộ sưu tập có ${products.length} sản phẩm (số lẻ). Hàng cuối của lưới sẽ có 1 vị trí trống.`,
      suggestedFix: "Có thể bổ sung thêm 1 sản phẩm để lưới hiển thị cân đối hoàn hảo.",
    })
  }

  return issues
}
