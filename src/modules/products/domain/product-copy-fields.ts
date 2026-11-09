/**
 * Bài giới thiệu sản phẩm (dữ liệu bán hàng đã sinh) → các trường hiển thị của thẻ kết quả. Tách nguyên văn từ
 * /tai-anh để /tai-anh và hành trình Tạo nội dung trên /cong-cu dùng chung (không đổi hành vi). Chỉ nhập kiểu từ
 * thẻ kết quả, cùng cách `analysis-schema-mapper.ts`.
 */
import type { ResultField } from "@/components/result/result-card"


export function mapProductCopyToFields(copy: Record<string, unknown>, analysisRaw: Record<string, unknown> | null): ResultField[] {
  const identity = analysisRaw ? (analysisRaw.identity as Record<string, unknown> | undefined) ?? {} : {}
  const rawTags = (copy.suggested_tags as string[]) ?? []
  const tags = Array.isArray(rawTags)
    ? rawTags.map((t, i) => ({ id: `tag-${i}`, value: typeof t === "string" ? t : String(t) }))
    : []
  const rawOccasions = (copy.suggested_occasions as string[]) ?? []
  const occasions = Array.isArray(rawOccasions)
    ? rawOccasions.map((o, i) => ({ id: `occ-${i}`, value: typeof o === "string" ? o : String(o) }))
    : []

  const rawPoints = (copy.key_selling_points as string[]) ?? []
  const keyPoints = Array.isArray(rawPoints)
    ? rawPoints.map((p, i) => ({ id: `usp-${i}`, value: typeof p === "string" ? p : String(p) }))
    : []

  const targetAudience = (copy.target_audience as Record<string, string> | undefined)
  const audienceText = targetAudience && typeof targetAudience === "object"
    ? `Người nhận: ${targetAudience.recipient || "—"} | Người mua: ${targetAudience.buyer_persona || "—"}`
    : (copy.target_audience ? String(copy.target_audience) : "")

  const priceRange = (copy.suggested_price_range as Record<string, number> | undefined)
  const priceRangeText = priceRange && typeof priceRange === "object"
    ? `${(priceRange.min_price || 0).toLocaleString("vi-VN")}đ - ${(priceRange.target_price || 0).toLocaleString("vi-VN")}đ - ${(priceRange.max_price || 0).toLocaleString("vi-VN")}đ`
    : ""

  const fields: ResultField[] = [
    { key: "suggested_name", label: "Tên sản phẩm gợi ý", type: "text", editable: true, value: (copy.suggested_name as string) ?? (identity.category as string) ?? "—" },
    { key: "short_headline", label: "Slogan / Tagline", type: "text", editable: true, value: (copy.short_headline as string) ?? "" },
    { key: "suggested_description", label: "Mô tả sản phẩm", type: "textarea", editable: true, value: (copy.suggested_description as string) ?? "" },
    { key: "flower_meaning_story", label: "Câu chuyện & cảm hứng sản phẩm", type: "textarea", editable: true, value: (copy.flower_meaning_story as string) ?? "" },
    { key: "key_selling_points", label: "Điểm bán hàng nổi bật (USP)", type: "list", editable: true, value: keyPoints, placeholder: "Thêm USP..." },
    { key: "suggested_style", label: "Phong cách thiết kế", type: "text", editable: true, value: (copy.suggested_style as string) ?? (identity.phong_cach as string) ?? "—" },
    { key: "suggested_tags", label: "Thẻ phân loại / SEO", type: "list", editable: true, value: tags, confidence: null, placeholder: "Thêm thẻ..." },
    { key: "suggested_occasions", label: "Dịp phù hợp", type: "list", editable: true, value: occasions, confidence: null, placeholder: "Thêm dịp..." },
    { key: "suggested_price_segment", label: "Phân khúc giá gợi ý", type: "readonly", editable: false, value: (copy.suggested_price_segment as string) ?? "standard" },
  ]

  if (audienceText) {
    fields.splice(5, 0, { key: "target_audience", label: "Đối tượng khách hàng mục tiêu", type: "text", editable: true, value: audienceText })
  }
  if (priceRangeText) {
    fields.push({ key: "suggested_price_range", label: "Dải giá đề xuất (Min - Chuẩn - Max)", type: "readonly", editable: false, value: priceRangeText })
  }

  return fields
}
