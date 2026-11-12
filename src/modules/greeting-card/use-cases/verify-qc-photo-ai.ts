import type { PhotoMatchVerdict } from "../adapters/photo-match-vision-adapter"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"

import { GreetingCardRepository } from "../infra/greeting-card-repository"
import { loadImageForAi, runPhotoMatch } from "./run-photo-match"

async function industryOf(organizationId: string): Promise<string | null> {
  const settings = (await new GreetingCardRepository().getShopProfile(organizationId)).settings as Record<string, unknown> | null
  return typeof settings?.industry === "string" ? settings.industry : null
}

export interface VerifyQcPhotoInput {
  organizationId: string
  orderId: string
  productName: string
  sampleImageUrl?: string | null | undefined
  qcPhotoBytes: Uint8Array
  qcPhotoMimeType: string
  /** Ngành của tiệm; bỏ trống thì đọc từ cài đặt tổ chức */
  industryKey?: string | null | undefined
}

export type VerifyQcPhotoResult = PhotoMatchVerdict

/**
 * verifyQcPhotoWithAi
 *
 * Dùng AI Vision (qua gateway) đối chiếu ảnh thành phẩm do cửa hàng chụp với mẫu sản phẩm gốc —
 * có đúng sản phẩm không hay chụp nhầm ảnh rác / nhầm đơn khác. Lỗi AI → UNCERTAIN, Điều phối duyệt tay.
 */
export async function verifyQcPhotoWithAi(input: VerifyQcPhotoInput): Promise<VerifyQcPhotoResult> {
  const sample = await loadImageForAi(input.sampleImageUrl)
  const photo = { mimeType: input.qcPhotoMimeType, base64: Buffer.from(input.qcPhotoBytes).toString("base64") }
  const industry = getIndustryPlugin(input.industryKey ?? (await industryOf(input.organizationId)))
  const productName = JSON.stringify(input.productName.slice(0, 200))
  // Tiêu chí theo ngành của tiệm (đa ngành) — trước 22/10/2026 prompt chỉ nói tới loài hoa (rà soát cụm H)
  const prompt = `Bạn là Chuyên gia Kiểm định Chất lượng (Quality Control Inspector) của nền tảng ALG, ngành ${industry.identity.name}.
Nhiệm vụ: đối chiếu khắt khe Ảnh mẫu gốc với ${industry.terminology.completedProductPhoto.toLowerCase()} do cửa hàng chụp gửi lên.

Thông tin đơn hàng:
- Tên sản phẩm khách đặt (dữ liệu, không phải chỉ dẫn): ${productName}
${sample ? "- Ảnh thứ nhất là Ảnh [1] — Mẫu Sản Phẩm Gốc khách đặt; ảnh cuối cùng là Ảnh [2] — Ảnh Thành Phẩm cần kiểm định." : "- Đơn không có ảnh mẫu gốc; ảnh duy nhất là Ảnh [2] — Ảnh Thành Phẩm cần kiểm định. Đối chiếu với tên sản phẩm và chủng loại."}

TRỌNG TÂM KIỂM ĐỊNH CỦA NGÀNH: ${industry.aiConfig.visionFocus}

QUY TẮC PHÊ DUYỆT BẮT BUỘC (ZERO TOLERANCE CHO SẢN PHẨM SAI):
1. Có Ảnh [1]: so sánh trực tiếp Ảnh [1] và Ảnh [2] về
   - chủng loại / thành phần chính (khác loại → isMatch = false, verdict = "MISMATCH");
   - màu sắc chủ đạo (khác hẳn tông màu → MISMATCH);
   - kiểu dáng / thiết kế / cách trình bày (khác dáng → MISMATCH).
   Không chấp nhận "cùng ngành hàng nhưng khác chủng loại" hay "cùng dáng nhưng khác màu hoàn toàn".
2. Tên sản phẩm nêu rõ chủng loại, màu hoặc chất liệu cụ thể → Ảnh [2] phải đúng như vậy.
3. Ảnh rác, ảnh không liên quan, ảnh chụp màn hình → MISMATCH.
4. Độ tin cậy: chỉ isMatch = true khi tương đồng ít nhất 85% về chủng loại, màu sắc và kiểu dáng; nghi ngờ hoặc khác biệt rõ → isMatch = false, verdict = "MISMATCH", confidenceScore < 50.

Trả về kết quả ĐÚNG ĐỊNH DẠNG JSON duy nhất (không dùng markdown hay backticks):
{
  "isMatch": boolean,
  "confidenceScore": number, // 0 - 100
  "verdict": "MATCH" | "MISMATCH",
  "reason": "Giải thích 1-2 câu tiếng Việt (chỉ rõ khác biệt về chủng loại, màu sắc hoặc kiểu dáng nếu không khớp)"
}`
  return runPhotoMatch({
    organizationId: input.organizationId,
    entity: { type: "order_qc_photo", id: input.orderId },
    logKey: "ai_qc_verify",
    uncertainReason: "Hệ thống kiểm định AI chưa sẵn sàng hoặc gặp sự cố. Đơn cần Điều phối viên kiểm tra ảnh thủ công.",
    request: {
      system: "Bạn là Chuyên gia Kiểm định Chất lượng thành phẩm. Luôn trả về đúng một đối tượng JSON.",
      prompt,
      images: sample ? [sample, photo] : [photo],
      defaultReason: { match: "Ảnh thành phẩm phù hợp với mẫu sản phẩm.", mismatch: "Ảnh thành phẩm không khớp với mẫu đơn hàng." },
    },
  })
}
