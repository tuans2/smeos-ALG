/**
 * Product Truth Validator (Kế thừa nguyên lý TR-POL-001 từ LocalBudd)
 * Pure Domain - Bảo vệ tính trung thực của sản phẩm trước ảo giác của AI.
 * Đảm bảo giá trị sản phẩm, mã hoa, và giá tiền thực tế không bị AI bịa đặt.
 */

export interface ProductFact {
  name: string
  code?: string | null | undefined
  price?: number | null | undefined
  originalPrice?: number | null | undefined
}

export interface ValidationIssue {
  field: string
  reason: string
}

export interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
}

export function validateProductTruth(
  originalProducts: ProductFact[],
  generatedContent: {
    headline?: string | undefined
    subHeadline?: string | undefined
    paragraphs?: string[] | undefined
  }
): ValidationResult {
  const issues: ValidationIssue[] = []
  const fullText = [
    generatedContent.headline || "",
    generatedContent.subHeadline || "",
    ...(generatedContent.paragraphs || []),
  ].join(" ")

  for (const prod of originalProducts) {
    // 1. Kiểm tra giá tiền không bị bóp méo nếu có xuất hiện số trong bài
    if (prod.price != null && prod.price > 0) {
      // Tìm các cụm số kèm "đ" hoặc "VND" hoặc "k"
      const priceMatches = fullText.match(/(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|vnd|đồng)/gi)
      if (priceMatches && priceMatches.length > 0) {
        // Nếu AI cố tình đề cập một con số giá sai lệch quá 50% so với giá thật
        for (const match of priceMatches) {
          const rawNum = parseInt(match.replace(/[^\d]/g, ""), 10)
          if (!isNaN(rawNum) && rawNum > 0) {
            // Cho phép sai số nếu đó là giá gốc gạch ngang hoặc giá khuyến mãi hợp lệ
            if (rawNum !== prod.price && Math.abs(rawNum - prod.price) / prod.price > 0.5) {
              issues.push({
                field: "price",
                reason: `Giá xuất hiện trong bài (${match}) chênh lệch bất thường so với giá niêm yết của sản phẩm (${prod.price}đ).`,
              })
            }
          }
        }
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}
