import type { LLMProvider, LLMRequest, LLMResponse } from "@/core/ports/llm-provider";
import type { AiModelCandidate } from "@/core/ai/domain/routing";
import type { AdapterOutcome } from "@/core/ai/gateway";

import type { HinhChieuPhanTich } from "../domain/analysis-projection";
import {
  chamBaKenh,
  DAI_MO_TA,
  DAI_THE,
  TEN_TOI_DA,
  type CopyOutput,
  type NgữCảnhChấm,
} from "../domain/copy-scoring";

export interface ProductCopyInput {
  /**
   * Hình chiếu của hợp đồng Vision — dựng bằng `projectAnalysisForCopy`,
   * KHÔNG đọc thẳng `raw`. Hợp đồng dùng khoá tiếng Việt và đọc sai tên
   * trường không làm đỏ ca thử nào, chỉ đưa `undefined` vào lời nhắc.
   */
  analysis: HinhChieuPhanTich;
  brand: {
    tone_of_voice?: string | null;
    hashtags?: string[] | null;
    /**
     * MỘT câu kêu gọi hành động — không phải mảng. Từ nợ #102 (17/09),
     * `cta_templates` đúng nghĩa chỉ mang câu CTA; quà tặng/cam kết đã
     * tách sang `default_offers`. Nợ #103 (cùng ngày): trước đây trường
     * này bị ép kiểu `string[]` rồi `.join()`, vỡ runtime với hình dạng
     * Json thật do giao diện lưu — nay gọi đúng `extractBrandCtaPhrase()`
     * ở nơi dựng payload (`generate-product-copy.ts`).
     */
    cta_templates?: string | null;
    forbidden_styles?: string[] | null;
  };
  occasions: Array<{ code: string; name: string }>;
}

export type ProductCopyOutput = CopyOutput & {
  suggested_price_segment: "budget" | "standard" | "premium" | "luxury";
  short_headline?: string;
  suggested_style?: string;
  seo_keywords?: string[];
  secondary_occasions?: string[];
  target_audience?: { recipient: string; buyer_persona: string };
  flower_meaning_story?: string;
  key_selling_points?: string[];
  card_message_suggestions?: { romantic: string; subtle: string; congratulatory: string };
  care_instructions?: string[];
  suggested_price_range?: { min_price: number; target_price: number; max_price: number };
  recommended_upsells?: string[];
};

const PHAN_KHUC = ["budget", "standard", "premium", "luxury"] as const;

function dong(nhan: string, gia_tri: string | number | null): string {
  return `- ${nhan}: ${gia_tri === null || gia_tri === "" ? "chưa xác định" : gia_tri}`;
}

export function buildPrompt(input: ProductCopyInput): string {
  const { analysis, brand, occasions } = input;
  const bom = analysis.bom;

  const ke = (ds: Array<{ name: string; quantity: number | null }>) =>
    ds.length === 0
      ? "không có"
      : ds.map((x) => (x.quantity ? `${x.name} (${x.quantity})` : x.name)).join(", ");

  const goi =
    bom.wrapping.length === 0
      ? "không có"
      : bom.wrapping
          .map((w) => [w.layer, w.material, w.color].filter(Boolean).join(" "))
          .filter((x) => x.length > 0)
          .join(", ") || "không có";

  const tenDip = occasions.map((o) => o.name);

  return `Bạn là chuyên viên viết nội dung bán hàng chuyên nghiệp.

SẢN PHẨM
${dong("Phân loại", analysis.identity.category)}
${dong("Hình dáng", analysis.identity.shape)}
${dong("Vật chứa", analysis.identity.container)}
${dong("Phong cách thiết kế", analysis.identity.phong_cach)}
${dong("Dịp sử dụng đã nhận diện", analysis.identity.dip_su_dung)}
${dong("Tông màu chủ đạo", analysis.tone_mau.length > 0 ? analysis.tone_mau.join(", ") : null)}
${dong("Tổng số cành", analysis.flower_count)}
${dong("Số nụ", analysis.bud_count)}
${dong("Độ tin cậy phân tích", analysis.confidence === null ? null : `${analysis.confidence}%`)}

ĐỊNH MỨC VẬT TƯ
${dong("Hoa", ke(bom.flowers))}
${dong("Lá và cành", ke(bom.foliage))}
${dong("Phụ kiện", ke(bom.accessories))}
${dong("Gói và trang trí", goi)}

THƯƠNG HIỆU
${dong("Giọng thương hiệu", brand.tone_of_voice ?? null)}
${dong("Hashtag của cửa hàng", brand.hashtags?.join(", ") ?? null)}
${dong("Mẫu kêu gọi hành động", brand.cta_templates ?? null)}
${dong("Cụm từ KHÔNG được dùng", brand.forbidden_styles?.join(", ") ?? null)}

DANH MỤC DỊP CỦA CỬA HÀNG
${tenDip.length > 0 ? tenDip.join(", ") : "cửa hàng chưa khai dịch nào"}

RÀNG BUỘC
- Chỉ viết về những gì có trong ĐỊNH MỨC VẬT TƯ ở trên. Không thêm loại hoa,
  màu sắc hay chi tiết nào không có trong danh sách đó.
- Không nêu con số nào ngoài những con số đã cho. Đặc biệt không tự đặt ra
  số cành, số bông hay kích thước.
- Trường nào ghi "chưa xác định" thì bỏ qua, không đoán thay.
- suggested_name: tối đa ${TEN_TOI_DA} ký tự, tiếng Việt có dấu.
- short_headline: tagline/slogan ngắn 1 dòng (dưới 60 ký tự) giàu cảm xúc.
- suggested_description: ${DAI_MO_TA.min}–${DAI_MO_TA.max} ký tự.
- suggested_style: phong cách thiết kế / trình bày sản phẩm.
- suggested_tags: ${DAI_THE.min}–${DAI_THE.max} thẻ, tiếng Việt KHÔNG dấu, viết thường, nối bằng dấu gạch ngang.
- seo_keywords: 3-5 từ khóa tìm kiếm Google Intent.
- suggested_occasions: chỉ chọn từ DANH MỤC DỊP CỦA CỬA HÀNG, chép đúng tên.
- target_audience: đối tượng người nhận (recipient) và chân dung người mua (buyer_persona).
- flower_meaning_story: câu chuyện ngắn 2-3 câu về ý nghĩa, nguồn gốc hoặc cảm hứng của sản phẩm (tùy ngành: ý nghĩa loài hoa, nghề thủ công, công thức gia truyền, v.v.).
- key_selling_points: 3 điểm bán hàng độc nhất (USP) để nhân viên chốt sale nhanh.
- card_message_suggestions: 3 mẫu lời chúc viết thiệp (romantic, subtle, congratulatory).
- care_instructions: 2-3 mẹo sử dụng, bảo quản hoặc kết hợp sản phẩm phù hợp với ngành hàng (ví dụ: bảo quản sản phẩm, cách dùng sản phẩm thủ công, cách bảo quản bánh, v.v.).
- suggested_price_segment: đúng một trong ${PHAN_KHUC.join(" | ")}.
- suggested_price_range: dải giá đề xuất VNĐ (min_price, target_price, max_price).
- recommended_upsells: 2-3 sản phẩm gợi ý bán kèm.

Trả về JSON đúng lược đồ đã cho, không thêm lời dẫn.`;
}

function hopLe(output: unknown): output is ProductCopyOutput {
  const o = output as Partial<ProductCopyOutput> | null;
  return (
    !!o &&
    typeof o.suggested_name === "string" &&
    o.suggested_name.length > 0 &&
    typeof o.suggested_description === "string" &&
    o.suggested_description.length > 0 &&
    Array.isArray(o.suggested_tags) &&
    Array.isArray(o.suggested_occasions) &&
    typeof o.suggested_price_segment === "string" &&
    (PHAN_KHUC as readonly string[]).includes(o.suggested_price_segment)
  );
}

export function createProductCopyAdapter(
  llmProvider: LLMProvider,
  input: ProductCopyInput,
  organizationId: string
): (model: AiModelCandidate) => Promise<AdapterOutcome<ProductCopyOutput>> {
  return async (model: AiModelCandidate) => {
    const batDau = Date.now();
    try {
      const request: LLMRequest = {
        organizationId,
        prompt: buildPrompt(input),
        // Khoá mô hình mà bộ định tuyến của cổng AI vừa chọn. Bỏ qua tham số
        // này là ghi vào `ai_requests` một quyết định chưa từng được thi hành.
        model: model.key,
        jsonSchema: {
          type: "object",
          properties: {
            suggested_name: { type: "string", maxLength: TEN_TOI_DA },
            short_headline: { type: "string", maxLength: 100 },
            suggested_description: {
              type: "string",
              minLength: DAI_MO_TA.min,
              maxLength: DAI_MO_TA.max,
            },
            suggested_style: { type: "string" },
            suggested_tags: {
              type: "array",
              items: { type: "string" },
              minItems: DAI_THE.min,
              maxItems: DAI_THE.max,
            },
            seo_keywords: {
              type: "array",
              items: { type: "string" },
              maxItems: 8,
            },
            suggested_occasions: {
              type: "array",
              items:
                input.occasions.length > 0
                  ? { type: "string", enum: input.occasions.map((o) => o.name) }
                  : { type: "string" },
            },
            secondary_occasions: {
              type: "array",
              items: { type: "string" },
              maxItems: 5,
            },
            target_audience: {
              type: "object",
              properties: {
                recipient: { type: "string" },
                buyer_persona: { type: "string" },
              },
              required: ["recipient", "buyer_persona"],
            },
            flower_meaning_story: { type: "string" },
            key_selling_points: {
              type: "array",
              items: { type: "string" },
              maxItems: 5,
            },
            card_message_suggestions: {
              type: "object",
              properties: {
                romantic: { type: "string" },
                subtle: { type: "string" },
                congratulatory: { type: "string" },
              },
              required: ["romantic", "subtle", "congratulatory"],
            },
            care_instructions: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
            },
            suggested_price_segment: { type: "string", enum: [...PHAN_KHUC] },
            suggested_price_range: {
              type: "object",
              properties: {
                min_price: { type: "number" },
                target_price: { type: "number" },
                max_price: { type: "number" },
              },
              required: ["min_price", "target_price", "max_price"],
            },
            recommended_upsells: {
              type: "array",
              items: { type: "string" },
              maxItems: 5,
            },
          },
          required: [
            "suggested_name",
            "suggested_description",
            "suggested_tags",
            "suggested_occasions",
            "suggested_price_segment",
          ],
        },
        maxTokens: 1800,
      };

      const response: LLMResponse = await llmProvider.complete(request);

      let output: unknown;
      try {
        output = JSON.parse(response.text);
      } catch {
        throw new Error("Mô hình trả về không phải JSON hợp lệ");
      }

      if (!hopLe(output)) {
        throw new Error("Kết quả thiếu trường bắt buộc hoặc phân khúc giá không hợp lệ");
      }

      const ngu_canh: NgữCảnhChấm = {
        analysis: input.analysis,
        occasionNames: input.occasions.map((o) => o.name),
        forbidden: input.brand.forbidden_styles ?? [],
      };

      const result: AdapterOutcome<ProductCopyOutput> = {
        ok: true,
        output,
        // Ba kênh mà `AIC-04` khai, chấm bằng luật tất định trên chính dữ
        // liệu đã có — không phải ba hằng số.
        scores: chamBaKenh(output, ngu_canh),
        latencyMs: Date.now() - batDau,
      };
      if (response.costUsd !== undefined) Object.assign(result, { costUsd: response.costUsd });
      if (response.inputTokens !== undefined) {
        Object.assign(result, { inputTokens: response.inputTokens });
      }
      if (response.outputTokens !== undefined) {
        Object.assign(result, { outputTokens: response.outputTokens });
      }
      return result;
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Lỗi không xác định",
      };
    }
  };
}
