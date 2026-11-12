/**
 * Chặng 02 — lời nhắc + bộ đọc JSON cho bước bóc tách ảnh sản phẩm hoa.
 *
 * 25/09/2026 (nợ #155): KHÔNG còn gọi thẳng API nhà cung cấp ở đây. Lời gọi đi
 * qua cổng AI (`callCapability`, `product-vision-ai-adapter.ts`) với nhiều nhà
 * cung cấp tương đương (OpenAI / Claude / Gemini) theo thứ tự ưu tiên của tiệm.
 * Tệp này chỉ giữ phần THUẦN: lời nhắc hệ thống, lời dặn cho ảnh, và ánh xạ
 * JSON mô hình trả về sang kiểu miền.
 */

import type {
  ProductFlowerComponent,
  ProductVisualAttributes,
  ProductPackaging,
  ProductInferredContext,
  ProductCardAccessory,
} from "../domain/product-intelligence-types";
import type { IndustryPluginContract } from "@/modules/organization/domain/industry-plugin-contract";
import { INDUSTRY_REGISTRY } from "@/modules/organization/domain/industries";

/** Một dòng hoa / lá / phụ kiện trong JSON mô hình Vision trả về (chưa kiểm dạng). */
interface VisionBomItem {
  name?: string;
  count?: string | number;
  quantity?: string | number;
  unit?: string;
  role?: string;
  color?: string;
  note?: string;
}

export interface VisionExtractionResult {
  productName: string;
  components: ProductFlowerComponent[];
  attributes: ProductVisualAttributes;
  packaging: ProductPackaging;
  context: ProductInferredContext;
}

export const PRODUCT_VISION_SYSTEM_PROMPT = `Bạn là chuyên gia thẩm định thị giác sản phẩm nghệ thuật cao cấp của ALG.
Nhiệm vụ của bạn là quan sát thật kỹ bức ảnh sản phẩm sản phẩm được cung cấp, nhận diện chính xác từng chi tiết và xuất ra định dạng JSON thuần túy (không markdown, không giải thích ngoài JSON) theo đúng cấu trúc sau:
{
  "product_name": "Tên thương mại cuốn hút cho sản phẩm (ví dụ: Sản phẩm hồng đỏ Passionate Love, Sản phẩm tulip cam cháy vintage...)",
  "flowers": [
    {
      "name": "Tên nguyên liệu chính xác bằng tiếng Việt (ví dụ: Hoa hồng đỏ Ohara, Hoa baby trắng, Hoa cúc tana...)",
      "count": 15, // ước tính số bông / cành nhìn thấy trong ảnh
      "unit": "cành", // hoặc "bông", "nhánh"
      "role": "dominant" // "dominant" cho hoa chủ đạo, "supporting" cho hoa phụ
    }
  ],
  "foliage": [
    {
      "name": "Tên loại lá phụ hoặc cành đệm (ví dụ: Lá bạc Eucalyptus, Lá chanh, Lá đuôi chồn...)",
      "count": 3,
      "unit": "cành"
    }
  ],
  "card": {
    "has_card": true, // true nếu nhìn thấy thiệp chúc mừng, tag cắm, biển mica, dải băng chữ; ngược lại false
    "card_type": "Thiệp gập thiết kế", // "Thiệp gập thiết kế" | "Tag cắm mini" | "Biển mica nghệ thuật" | "Banner dải băng chữ" | "Không có"
    "printed_text": "Chúc mừng sinh nhật em yêu", // BẮT BUỘC: Đọc chính xác chữ in hoặc viết tay nhìn thấy trên thiệp/banner qua OCR thị giác. Nếu không có thiệp hoặc thiệp trắng chưa viết chữ thì để null
    "color": "Tone màu của thiệp (ví dụ: Trắng viền ép kim, Hồng pastel...)"
  },
  "ribbon_detail": {
    "material": "Chất liệu nơ ruy băng (ví dụ: Ruy băng satin lụa bóng, Ruy băng voan mờ, Dây thừngi thô vintage, Ruy băng gân ren...)",
    "color": "Màu sắc của ruy băng (ví dụ: Đỏ ruby, Xanh rêu, Trắng kem, Hồng phấn...)",
    "bow_style": "Kiểu dáng nơ (ví dụ: Nơ cánh bướm 2 tầng, Nơ rủ dài Hàn Quốc, Thắt nút đơn...)"
  },
  "other_accessories": [
    {
      "name": "Tên phụ kiện trang trí đi kèm nếu có (ví dụ: Đèn LED đom đóm, Gấu bông mini tốt nghiệp, Que cắm trái tim, Bóng bay jumbo mica, Vương miện mini...)",
      "quantity": 1,
      "unit": "cái",
      "note": "Ghi chú màu sắc/đặc điểm"
    }
  ],
  "dominant_colors": ["Màu chính 1", "Màu chính 2"], // ví dụ: ["Đỏ nhung", "Trắng kem"]
  "secondary_colors": ["Màu phụ 1"], // ví dụ: ["Xanh rêu", "Xanh lá"]
  "style": "Phong cách thiết kế (ví dụ: Classic Romantic & Sang trọng, Vintage Cổ điển, Hiện đại Hàn Quốc, Tự nhiên mộc mạc...)",
  "shape": "Dáng cắm (ví dụ: Bó tròn tự nhiên, Bó dáng dài, Giỏ hoa để bàn, Hộp hoa trái tim...)",
  "size": "Kích thước ước tính (ví dụ: Tiêu chuẩn (M), Cao cấp (L), Khổng lồ (XL)...)",
  "wrapping_material": "Chất liệu giấy gói (ví dụ: Giấy lụa mờ Kraft gấp nếp, Giấy xi măng, Giấy xốp chống nước...)",
  "wrapping_color": "Màu sắc giấy gói (ví dụ: Trắng kem xếp tầng, Nâu mộc, Đen huyền bí...)",
  "ribbon": "Màu và loại nơ / ruy băng ngắn gọn (ví dụ: Ruy băng voan trắng kem, Ruy băng satin đỏ nhung...)",
  "occasions": ["Dịp tặng phù hợp 1", "Dịp tặng phù hợp 2"], // ví dụ: ["Tỏ tình lãng mạn", "Kỷ niệm tình yêu", "Sinh nhật bạn gái", "Valentine"]
  "audience": "Mô tả tệp khách hàng phù hợp nhất (ví dụ: Nam giới 20–35 tuổi tặng bạn gái / vợ)",
  "suggested_price": 650000, // Giá bán đề xuất thực tế (VND)
  "confidence": 0.9 // Độ tin cậy mô hình tự đánh giá (0–1), KHÔNG làm tròn lên
}`;

export function getProductVisionSystemPrompt(industryPlugin?: IndustryPluginContract): string {
  const plugin = industryPlugin || INDUSTRY_REGISTRY.FLORAL!;
  const terms = plugin.terminology;
  const isFloral = plugin.identity.key === "FLORAL";

  if (isFloral) {
    return PRODUCT_VISION_SYSTEM_PROMPT;
  }

  const visionFocus = plugin.aiConfig?.visionFocus || "";
  const sampleProducts = plugin.aiConfig?.sampleProductNames?.slice(0, 3).join(", ") || "";
  const units = terms.defaultMeasurementUnits?.slice(0, 5).join(", ") || "cái, món";

  return `Bạn là chuyên gia thẩm định thị giác sản phẩm và dịch vụ ngành "${plugin.identity.name}" của hệ thống ALG.
Nhiệm vụ của bạn là quan sát kỹ bức ảnh được cung cấp, nhận diện chính xác các thành phần, cấu trúc, vật tư, tiện nghi, đặc tính và định tính thương mại theo đặc thù ngành.
Trọng tâm quan sát: ${visionFocus}

Xuất ra định dạng JSON thuần túy (không markdown, không giải thích ngoài JSON) theo đúng cấu trúc sau:
{
  "product_name": "Tên thương mại cuốn hút cho sản phẩm/không gian (gợi ý: ${sampleProducts})",
  "components": [
    {
      "name": "Tên thành phần / vật tư / tiện nghi / chi tiết nhận diện được trong ảnh",
      "count": 1, // số lượng ước tính quan sát thấy
      "unit": "đơn vị phù hợp (${units})",
      "role": "dominant" // "dominant" cho thành phần chính/nổi bật, "supporting" cho thành phần phụ/tiện ích đi kèm
    }
  ],
  "dominant_colors": ["Tone màu chủ đạo 1", "Tone màu chủ đạo 2"],
  "secondary_colors": ["Tone màu phụ"],
  "style": "Phong cách thiết kế / bài trí (ví dụ: Tối giản Hiện đại, Vintage Cổ điển, Sang trọng Tinh tế...)",
  "shape": "Bố cục / Dáng sản phẩm / Loại không gian",
  "size": "Kích thước / Quy mô ước tính",
  "wrapping_material": "Chất liệu bao bì hoặc hoàn thiện chính",
  "occasions": ["Dịp / Nhu cầu sử dụng phù hợp 1", "Dịp / Nhu cầu sử dụng phù hợp 2"],
  "audience": "Mô tả tệp khách hàng tiềm năng phù hợp nhất",
  "suggested_price": 500000, // Giá bán / giá thuê đề xuất ước tính thực tế (VND)
  "confidence": 0.9 // Độ tin cậy mô hình tự đánh giá (0–1)
}`;
}

export function productVisionUserText(productTitle?: string | undefined, industryPlugin?: IndustryPluginContract): string {
  const plugin = industryPlugin || INDUSTRY_REGISTRY.FLORAL!;
  if (plugin.identity.key === "FLORAL") {
    return `Hãy quan sát thật kỹ và bóc tách toàn diện sản phẩm hoa trong bức ảnh này.${
      productTitle ? ` Gợi ý tiêu đề ban đầu: ${productTitle}.` : ""
    } Đặc biệt chú ý:
1. Nhận diện các nguyên liệu chính, hoa phụ và cả LÁ PHỤ ĐỆM (foliage).
2. Soi kỹ mặt trước, chân bó và vùng nơ xem CÓ THIỆP / BIỂN CHỮ KHÔNG, đọc chính xác nội dung chữ in/viết trên thiệp (OCR).
3. Bóc tách chi tiết chất liệu giấy gói, màu ruy băng và phụ kiện trang trí đi kèm.`;
  }

  return `Hãy quan sát thật kỹ và bóc tách toàn diện cấu trúc sản phẩm / dịch vụ thuộc ngành "${plugin.identity.name}" trong bức ảnh này.${
    productTitle ? ` Gợi ý tiêu đề ban đầu: ${productTitle}.` : ""
  } Đặc biệt chú ý:
1. Bóc tách danh sách thành phần, tiện nghi, vật tư hoặc chi tiết cấu thành (${plugin.terminology.rawMaterialItem}).
2. Nhận diện tone màu chủ đạo, phong cách bài trí/thiết kế, đối tượng khách hàng và các dịp/nhu cầu sử dụng thích hợp.`;
}

/** Đọc JSON mô hình trả về → kiểu miền. Không đọc được → `null`. Hỗ trợ cả Floral và các ngành Đa ngành SME. */
export function parseProductVisionJson(
  content: string,
  productTitle?: string | undefined,
  industryPlugin?: IndustryPluginContract
): VisionExtractionResult | null {
  try {
    const parsed = JSON.parse(content);
    const plugin = industryPlugin || INDUSTRY_REGISTRY.FLORAL!;
    const defaultUnit = plugin.terminology.defaultMeasurementUnits[0] || "cái";

    const components: ProductFlowerComponent[] = [];

    // 1. Mảng components tổng quát (Đa ngành)
    if (Array.isArray(parsed.components)) {
      parsed.components.forEach((c: VisionBomItem, idx: number) => {
        if (!c.name && !c.role) return;
        components.push({
          id: `comp-${idx}`,
          flowerType: c.name || `Thành phần #${idx + 1}`,
          quantityEstimate: parseInt(String(c.count ?? c.quantity)) || 1,
          unit: c.unit || defaultUnit,
          role: c.role === "supporting" ? "supporting" : "dominant",
          color: c.color,
        });
      });
    }

    // 2. Mảng flowers (Ngành hoa)
    if (Array.isArray(parsed.flowers)) {
      parsed.flowers.forEach((f: VisionBomItem, idx: number) => {
        components.push({
          id: `flower-${idx}`,
          flowerType: f.name || `Nguyên liệu #${idx + 1}`,
          quantityEstimate: parseInt(String(f.count ?? f.quantity)) || 0,
          unit: f.unit || "cành",
          role: f.role === "supporting" ? "supporting" : "dominant",
          color: f.color,
        });
      });
    }

    // 3. Mảng foliage (Lá đệm hoa)
    if (Array.isArray(parsed.foliage)) {
      parsed.foliage.forEach((fol: VisionBomItem, idx: number) => {
        components.push({
          id: `foliage-${idx}`,
          flowerType: fol.name || "Lá phụ trang trí",
          quantityEstimate: parseInt(String(fol.count ?? fol.quantity)) || 0,
          unit: fol.unit || "cành",
          role: "foliage",
          color: fol.color,
        });
      });
    }

    // 4. Mảng vật tư phụ / tiện nghi khác
    const extraItems = Array.isArray(parsed.materials)
      ? parsed.materials
      : Array.isArray(parsed.amenities)
      ? parsed.amenities
      : Array.isArray(parsed.items)
      ? parsed.items
      : [];
    if (extraItems.length > 0 && components.length === 0) {
      extraItems.forEach((it: VisionBomItem, idx: number) => {
        components.push({
          id: `item-${idx}`,
          flowerType: it.name || `Chi tiết #${idx + 1}`,
          quantityEstimate: parseInt(String(it.count ?? it.quantity)) || 1,
          unit: it.unit || defaultUnit,
          role: it.role === "supporting" ? "supporting" : "dominant",
          color: it.color,
        });
      });
    }

    // Không có thành phần, không có màu sắc, không có phong cách và tên -> không đọc được ảnh
    const dominantColors = Array.isArray(parsed.dominant_colors) ? parsed.dominant_colors : [];
    if (components.length === 0 && dominantColors.length === 0 && !parsed.style && !parsed.product_name) {
      return null;
    }

    const attributes: ProductVisualAttributes = {
      mainColors: dominantColors,
      secondaryColors: Array.isArray(parsed.secondary_colors) ? parsed.secondary_colors : [],
      style: parsed.style || "",
      shape: parsed.shape || "",
      sizeEstimate: parsed.size || "",
    };

    // Phân rã nguyên tử phụ liệu (Card, Ribbon, Decor)
    const cardData = parsed.card;
    const hasCard = Boolean(cardData?.has_card || cardData?.printed_text);
    const card = hasCard
      ? {
          hasCard: true,
          cardType: (cardData?.card_type as ProductCardAccessory["cardType"]) || "Thiệp gập thiết kế",
          printedText: cardData?.printed_text || undefined,
          color: cardData?.color || undefined,
        }
      : {
          hasCard: false,
        };

    const ribbonDetail = parsed.ribbon_detail
      ? {
          ribbonMaterial: parsed.ribbon_detail.material || parsed.ribbon || "",
          ribbonColor: parsed.ribbon_detail.color || "",
          bowStyle: parsed.ribbon_detail.bow_style || "",
        }
      : {
          ribbonMaterial: parsed.ribbon || "",
          ribbonColor: "",
          bowStyle: "",
        };

    const otherAccessories = Array.isArray(parsed.other_accessories)
      ? parsed.other_accessories.map((acc: VisionBomItem, i: number) => ({
          id: `acc-${i}`,
          name: acc.name || "Phụ kiện",
          quantity: parseInt(String(acc.quantity)) || 1,
          unit: acc.unit || "cái",
          color: acc.color,
          note: acc.note,
        }))
      : [];

    const accessoriesList: string[] = [];
    if (card.hasCard) {
      accessoriesList.push(card.printedText ? `Thiệp: "${card.printedText}"` : "Thiệp chúc mừng thiết kế");
    }
    if (otherAccessories.length > 0) {
      otherAccessories.forEach((acc: { name: string; quantity: number; unit: string }) => accessoriesList.push(`${acc.name} (${acc.quantity} ${acc.unit})`));
    }

    const packaging: ProductPackaging = {
      wrappingMaterial: parsed.wrapping_material || "",
      wrappingColor: parsed.wrapping_color || "",
      ribbon: parsed.ribbon || [ribbonDetail.ribbonMaterial, ribbonDetail.ribbonColor].filter(Boolean).join(" màu "),
      accessories: accessoriesList,
      card,
      ribbonDetail,
      otherAccessories: otherAccessories.length > 0 ? otherAccessories : undefined,
    };

    const inferredOccasions: string[] = Array.isArray(parsed.occasions) && parsed.occasions.length > 0
      ? parsed.occasions
      : [];

    // Nếu chữ trên thiệp có chứa từ khoá dịp cụ thể, đưa lên đầu danh sách dịp
    if (card.printedText) {
      const lower = card.printedText.toLowerCase();
      if (lower.includes("sinh nhật") && !inferredOccasions.some((o) => o.toLowerCase().includes("sinh nhật"))) {
        inferredOccasions.unshift("Sinh nhật");
      } else if (lower.includes("kỷ niệm") && !inferredOccasions.some((o) => o.toLowerCase().includes("kỷ niệm"))) {
        inferredOccasions.unshift("Kỷ niệm ngày cưới");
      } else if (lower.includes("khai trương") && !inferredOccasions.some((o) => o.toLowerCase().includes("khai trương"))) {
        inferredOccasions.unshift("Khai trương chúc mừng");
      }
    }

    const context: ProductInferredContext = {
      likelyOccasions: inferredOccasions,
      likelyAudience: parsed.audience || "",
      // 0 = mô hình không đề xuất — giao diện để trống cho chủ tiệm tự nhập, không bịa giá.
      suggestedPrice: parseInt(parsed.suggested_price) || 0,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    };

    return {
      productName: parsed.product_name || productTitle || "Sản phẩm mới",
      components,
      attributes,
      packaging,
      context,
    };
  } catch {
    return null;
  }
}
