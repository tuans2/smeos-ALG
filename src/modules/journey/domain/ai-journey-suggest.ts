/**
 * Đề xuất lộ trình thông minh (AI Journey Suggest) — Kiến trúc Journey-First.
 * Nguồn đặc tả: ALG_CORE_JOURNEY_FIRST_UX_ARCHITECTURE_FINAL.md (§2.4, §7.3)
 *
 * Luật nghiệp vụ ALG (AGENTS.md):
 * "BẮT BUỘC HỎI & CHỐT VỚI CHỦ SẢN PHẨM TRƯỚC KHI THỰC HIỆN:
 * Không chạy mù quáng toàn bộ 14 bước. Đưa ra các chặng đề xuất để người dùng lựa chọn."
 *
 * Luật Clean Architecture: Thuần túy không import React, không import Prisma.
 * UX Lint R8: Không hiển thị mã kỹ thuật (M01a, M04b, RBAC...) trong nhãn/mô tả.
 */

import type { JourneyStepDefinition } from "./journey-model"

export interface AiJourneySuggestion {
  id: string
  headline: string
  reasoning: string
  suggestedSteps: JourneyStepDefinition[]
}

/**
 * Đề xuất hành trình dựa trên ảnh sản phẩm người dùng vừa tải lên
 */
export function suggestJourneyFromPhoto(photoInfo: {
  hasImage: boolean
  fileName?: string
}): AiJourneySuggestion {
  return {
    id: "ai-suggest-photo-workflow",
    headline: "Đề xuất lộ trình xử lý ảnh sản phẩm",
    reasoning:
      "Ảnh hoa đã được nhận diện hợp lệ. Hệ thống đề xuất 3 tác vụ chính để đưa sản phẩm ra thị trường nhanh nhất.",
    suggestedSteps: [
      {
        id: "step-analyze-flowers",
        label: "Phân tích loài hoa & công thức cắm",
        description: "Bóc tách thành phần, lá đệm, phong cách cắm và chi phí vốn",
        inputType: "CONFIRMATION",
        isOptional: false,
        nextStepId: "step-render-backdrop",
      },
      {
        id: "step-render-backdrop",
        label: "Ghép bối cảnh lifestyle sang trọng",
        description: "Tách nền sắc nét và đặt sản phẩm vào không gian phòng khách hiện đại",
        inputType: "CONFIG_SELECT",
        isOptional: false,
        nextStepId: "step-write-copy",
      },
      {
        id: "step-write-copy",
        label: "Soạn nội dung bài đăng Facebook/Zalo",
        description: "Viết thông điệp ý nghĩa tặng sinh nhật, khai trương hoặc kỷ niệm",
        inputType: "CONFIRMATION",
        isOptional: true,
        nextStepId: null,
      },
    ],
  }
}
