"use client"

import { useEffect, useMemo, useState } from "react"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import { useSession } from "@/lib/session"
import type { TenantSalesDefaults } from "@/modules/products/domain/sales-pitch-template"
import { extractBrandCtaPhrase } from "@/modules/profiles/domain/profile-rules"

/**
 * Hồ sơ mặc định của cửa hàng cho Thẻ chào sản phẩm (`buildSalesPitchData`): tên, hotline, quà tặng, cam kết, câu
 * kêu gọi, danh mục dịp và câu chào riêng. Dùng chung cho /tai-anh và hành trình Tạo nội dung trên /cong-cu —
 * tách nguyên văn từ /tai-anh, không đổi hành vi.
 */
export function useTenantSalesDefaults(): TenantSalesDefaults | null {
  const session = useSession()
  // Hồ sơ tenant thật (business_profiles/brand_profiles) — bắt buộc nối vào
  // buildSalesPitchData() để Thẻ chào A6 / kịch bản Zalo không rơi về tên
  // tiệm/hotline giả khi gửi cho khách hàng thật (vá lỗi rà soát 17/09/2026).
  const { business: tenantBusiness, brand: tenantBrand } = useTenantProfile()

  // Danh mục dịp của tenant (nợ #104, "giọng theo dịp") — nạp riêng, không
  // qua useTenantProfile() vì occasions là một DANH SÁCH, không phải hồ sơ
  // đơn như business/brand. Lỗi tải bị nuốt có chủ đích: đây là một tính
  // năng bổ trợ (chỉnh tông giọng), không được làm hỏng luồng tạo Thẻ chào
  // chính nếu API occasions tạm thời lỗi — rơi về NEUTRAL cho mọi dịp là an
  // toàn (giữ nguyên kịch bản mặc định hiện có).
  const [tenantOccasions, setTenantOccasions] = useState<Array<{ name: string; register: "FESTIVE" | "NEUTRAL" | "SOLEMN" }>>([])
  useEffect(() => {
    let cancelled = false
    fetch("/api/v1/occasions")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.data) return
        const rows = (json.data as Array<{ name: string; register: string; is_active: boolean }>)
          .filter((o) => o.is_active)
          .map((o) => ({ name: o.name, register: o.register as "FESTIVE" | "NEUTRAL" | "SOLEMN" }))
        setTenantOccasions(rows)
      })
      .catch(() => { /* rơi về NEUTRAL, không chặn luồng chính — xem chú thích trên */ })
    return () => { cancelled = true }
  }, [session.organization?.id])

  // Câu chào mở đầu kịch bản Zalo ghi đè theo tenant (nợ #99, Giai đoạn 3 —
  // field đầu tiên của `template_overrides`, họ ST). Lỗi tải bị nuốt có chủ
  // đích, cùng lý do như occasions ở trên: đây là một tuỳ chỉnh bổ trợ,
  // không được làm hỏng luồng tạo Thẻ chào chính — thiếu thì rơi về kịch bản
  // mặc định hệ thống (không có dòng chào riêng), không bịa câu chào thay tenant.
  const [tenantGreetingLine, setTenantGreetingLine] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch("/api/v1/template-overrides?template_key=sales_pitch_zalo")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.data) return
        const rows = json.data as Array<{ field_key: string; value: string }>
        const greeting = rows.find((r) => r.field_key === "greeting_line")
        setTenantGreetingLine(greeting?.value ?? null)
      })
      .catch(() => { /* giữ null, rơi về kịch bản mặc định — xem chú thích trên */ })
    return () => { cancelled = true }
  }, [session.organization?.id])

  return useMemo(() => {
    if (!tenantBusiness && !tenantBrand) return null
    // Quà tặng/cam kết: đọc `default_offers` (nợ #102, 17/09); dự phòng đọc
    // vị trí cũ `cta_templates.free_gifts`/`.guarantees` cho tổ chức đã lưu
    // trước bản sửa, để không rơi về mặc định hệ thống một cách bất ngờ.
    const offers = (tenantBrand?.default_offers as { free_gifts?: string[]; guarantees?: string[] } | null) ?? null
    const legacyCta = (tenantBrand?.cta_templates as { free_gifts?: string[]; guarantees?: string[] } | null) ?? null
    const freeGifts = offers?.free_gifts ?? legacyCta?.free_gifts ?? null
    const guarantees = offers?.guarantees ?? legacyCta?.guarantees ?? null

    // Câu kêu gọi hành động: `cta_templates` đúng nghĩa (nợ #102) là MỘT
    // câu, lưu ở hình dạng thật `{ default: string }` do brand-profile-form
    // ghi — không phải mảng. Đọc qua cùng hàm thuần dùng ở M01b
    // (`generate-product-copy.ts`) để không lặp lại lỗi ép kiểu sai hình
    // dạng đã gây vỡ runtime (nợ #103); hình dạng cũ trước 17/09
    // ({free_gifts, guarantees} lồng trong cta_templates) không phải một
    // câu CTA nên bị bỏ qua an toàn ở đây, giống hàm dùng chung.
    const ctaPhrase = extractBrandCtaPhrase(tenantBrand?.cta_templates ?? null)
    const ctaPhrases = ctaPhrase ? [ctaPhrase] : null

    return {
      shopName: tenantBusiness?.display_name ?? null,
      shopHotline: tenantBusiness?.phone ?? null,
      freeGifts: Array.isArray(freeGifts) && freeGifts.length > 0 ? freeGifts : null,
      guarantees: Array.isArray(guarantees) && guarantees.length > 0 ? guarantees : null,
      ctaPhrases,
      // nợ #104: danh mục dịp -> tông giọng. Nạp độc lập với
      // tenantBusiness/tenantBrand nên KHÔNG được gộp vào điều kiện
      // "!tenantBusiness && !tenantBrand" phía trên — một tổ chức có thể đã
      // cấu hình dịp mà chưa nhập hồ sơ business/brand.
      occasionRegistry: tenantOccasions.length > 0 ? tenantOccasions : null,
      // nợ #99: cùng lý do occasionRegistry ở trên — nạp độc lập, không gộp
      // vào điều kiện "!tenantBusiness && !tenantBrand" phía trên.
      greetingLine: tenantGreetingLine,
    }
  }, [tenantBusiness, tenantBrand, tenantOccasions, tenantGreetingLine])
}
