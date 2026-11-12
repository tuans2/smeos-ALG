/**
 * ALG Template Engine — System Golden Templates
 * Bộ mẫu chuẩn hệ sinh thái cho các kịch bản tư vấn, thẻ chào và vận hành.
 *
 * ═══ DỰ TRỮ, KHÔNG PHẢI NỢ (nợ #99, chốt qua AskUserQuestion 17/09) ═══
 * Toàn bộ `src/core/templates/*` (tệp này + `domain/template-types.ts`,
 * `domain/interpolation-engine.ts`, `domain/variable-catalog.ts`) KHÔNG có
 * nơi gọi nào trong `src/app` — rà bằng grep xác nhận 0 call site. Đây là một
 * engine template generic (biến `{{key}}`, "system golden" vs "tenant
 * override") dựng trước nhưng chưa từng nối vào luồng thật:
 * `generateZaloPitchScript()` (`products/domain/sales-pitch-template.ts`) là
 * một hàm build chuỗi Việt HẰNG, không đi qua `interpolateTemplate()` ở đây.
 *
 * Anh Tony chốt 17/09: GIỮ LẠI, không gỡ — đánh dấu rõ là hạ tầng dự trữ cho
 * nhu cầu tương lai (VD: cơ chế ghi đè template theo tenant, nợ #99, khi
 * phạm vi ghi đè và họ template ưu tiên được chốt). KHÔNG phải nợ kỹ thuật
 * cần trả — không xoá, không "dọn dẹp" các tệp này khi không có yêu cầu rõ
 * ràng nối chúng vào một tính năng cụ thể.
 */

import type { TemplateDefinition } from "./domain/template-types"

export const SYSTEM_GOLDEN_TEMPLATES: TemplateDefinition[] = [
  {
    id: "zalo_sales_pitch_standard",
    category: "sales_pitch",
    name: "Kịch bản Zalo Tư Vấn Bán Hàng Chuẩn",
    description: "Mẫu tin nhắn Zalo 1-chạm gửi khách hàng kèm chi tiết hoa, quà tặng và hotline",
    format: "plain_text",
    requiredVariables: [
      "product.name",
      "pricing.selling_price_vnd",
      "flower.summary_list",
      "shop.hotline",
    ],
    isSystemGolden: true,
    schemaVersion: 1,
    templateString: `🌸 DẠ EM CHÀO ANH/CHỊ Ạ!

Em gửi anh/chị thông tin sản phẩm đang được yêu thích bên em:
✨ Tên mẫu: {{product.name}}
🏷️ Mã sản phẩm: {{product.sku | default: "SP-Flora"}}
🌿 Phong cách: {{product.style | default: "Thiết kế hiện đại"}}

💐 THÀNH PHẦN HOA & PHỤ KIỆN:
{{flower.summary_list}}
🎨 Tone màu: {{flower.main_tones}}
🎀 Quy cách gói: {{flower.wrapping}}

💰 GIÁ ƯU ĐÃI HÔM NAY:
👉 {{pricing.selling_price_vnd}} (Giá niêm yết: {{pricing.original_price_vnd | default: "750.000đ"}})

🎁 QUÀ TẶNG KÈM THEO:
{{service.gifts_bullets}}

🛡️ CAM KẾT TỪ {{shop.name | default: "FLORA BOUTIQUE"}}:
{{service.commitments_bullets}}

Dạ anh/chị chốt mẫu này để bên em lên đơn và chuẩn bị sản phẩm mới nhất cho mình nhé!
Hotline/Zalo hỗ trợ: {{shop.hotline}} 💖`,
  },
  {
    id: "florist_bom_ticket_standard",
    category: "production",
    name: "Phiếu Kỹ Thuật Chế Tác (BOM Ticket)",
    description: "Phiếu sản xuất cho thợ chế tác: chi tiết từng nguyên liệu, số cành, kiểu gói",
    format: "plain_text",
    requiredVariables: ["product.name", "flower.summary_list"],
    isSystemGolden: true,
    schemaVersion: 1,
    templateString: `📋 PHIẾU KỸ THUẬT SẢN XUẤT CẮM HOA
------------------------------------------
Sản phẩm: {{product.name}} (Mã: {{product.sku}})
Phong cách: {{product.style}}
Hướng nhìn: {{flower.facing | default: "360 độ"}}

DANH MỤC HOA & NGUYÊN LIỆU:
{{flower.summary_list}}
Tone màu: {{flower.main_tones}}
Giấy gói & Nơ: {{flower.wrapping}}

YÊU CẦU ĐẶC BIỆT:
- Sản phẩm đồng đều, cắt gốc xéo 45 độ.
- Chụp ảnh 3 góc (chính diện, trên xuống, cận cảnh) gửi bộ phận điều phối duyệt trước khi bọc màng bảo vệ.
------------------------------------------
Cửa hàng: {{shop.name}}`,
  },
]

export function getSystemGoldenTemplate(templateId: string): TemplateDefinition | undefined {
  return SYSTEM_GOLDEN_TEMPLATES.find((t) => t.id === templateId)
}
