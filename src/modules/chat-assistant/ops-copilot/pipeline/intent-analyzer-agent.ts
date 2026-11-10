/**
 * Agent 1: Intent & Context Analyzer Agent (Nâng Cấp Giai Đoạn 1).
 * Chuyên trách phân tích câu hỏi người dùng, giải mã ý định tác vụ,
 * nhận diện vai trò, ngữ cảnh hội thoại đa lượt (Multi-turn Context) và phong cách Persona.
 */

import {
  normalizeUserRole,
  detectResponseStyle,
  type OpsResponseStyle,
} from "../knowledge-base"
import type { ParsedIntent, ConversationContext } from "./pipeline-types"

export class IntentAnalyzerAgent {
  analyze(
    query: string,
    userRole?: string,
    requestedStyle?: OpsResponseStyle,
    context?: ConversationContext
  ): ParsedIntent {
    const trimmed = query.trim()
    const lower = trimmed.toLowerCase()
    const normalizedRole = normalizeUserRole(userRole)

    // 1. Nhận diện tính chất khẩn cấp & sự cố
    const troubleKeywords = ["lỗi", "không hiện", "bị khóa", "thất bại", "tại sao không", "không tải được", "cảnh báo", "không được", "sai số"]
    const fastKeywords = ["nhanh", "gấp", "tóm tắt", "vắn tắt", "ngắn gọn", "liền", "ngay bây giờ"]

    let urgency: "NORMAL" | "HIGH" | "TROUBLE" = "NORMAL"
    if (troubleKeywords.some((kw) => lower.includes(kw))) {
      urgency = "TROUBLE"
    } else if (fastKeywords.some((kw) => lower.includes(kw))) {
      urgency = "HIGH"
    }

    // 2. Xác định phong cách phản hồi
    const style = requestedStyle || detectResponseStyle(trimmed, userRole)

    // 3. Phân biệt câu hỏi tổng quan vs câu hỏi nghiệp vụ
    const overviewKeywords = [
      "chức năng gì", "tính năng gì", "hỗ trợ những gì", "tổng quan",
      "hệ thống có những gì", "danh sách phân hệ", "hướng dẫn chung",
      "giới thiệu hệ thống", "smeos có gì", "floraos có gì", "bao nhiêu chức năng",
      "danh sách các chức năng", "chức năng hệ thống", "tất cả chức năng",
      "các tính năng", "danh sách tính năng"
    ]
    const isOverviewRequest = overviewKeywords.some((kw) => lower.includes(kw))

    // 4. Nhận diện hội thoại tiếp nối đa lượt (Multi-turn Follow-up Detection)
    let isFollowUp = false
    let followUpStepNumber: number | undefined = undefined

    const stepMatch = lower.match(/(?:bước|buoc)\s*([1-5])/i)
    if (stepMatch && stepMatch[1]) {
      followUpStepNumber = parseInt(stepMatch[1], 10)
      isFollowUp = true
    } else if (context?.lastTopicNodeId) {
      const followUpPhrases = [
        "thế còn", "tiếp theo", "rồi sao", "làm sao để", "ở đâu",
        "bấm vào đâu", "chi tiết hơn", "nếu không có", "chưa có",
        "link ở đâu", "cài ở đâu", "in ở đâu"
      ]
      if (followUpPhrases.some((phrase) => lower.includes(phrase)) || trimmed.split(" ").length <= 4) {
        isFollowUp = true
      }
    }

    // 5. Trích xuất các mẫu nhận diện hành động & từ lóng ngành hoa
    const actionPatterns = [
      "tạo thẻ", "bộ sưu tập", "thẻ chào", "bộ sưu tập riêng", "bộ sưu tập chung", "in phiếu", "phiếu xưởng", "giấu giá",
      "ẩn giá", "phiếu giao", "tạo hoa", "công thức cành", "bom", "atomic bom", "nhập excel",
      "drive", "quét ảnh", "đếm cành", "kịch bản zalo", "kho dữ liệu", "thùng rác",
      "hồ sơ", "stk", "ngân hàng", "vietqr", "thêm nhân viên", "phân quyền",
      // Thuật ngữ cửa hàng thực tế:
      "bắt cọc", "bắn zalo", "lên kệ", "cắt phế", "giấu giá thợ", "chốt đơn", "báo giá",
      "gửi ảnh", "ảnh hoàn thành", "ảnh thành phẩm", "số lượng ảnh", "duyệt ảnh", "ảnh tp", "ảnh nhận",
      "tạo từ chat", "dán tin nhắn", "đếm ngược 10 phút", "bỏ qua ảnh", "kéo thả kép",
      "napas 247", "chống tự khóa", "cấp tài khoản 10s", "choicegrid", "storegrowthcenter"
    ]
    const matchedPatterns = actionPatterns.filter((pattern) => lower.includes(pattern))

    return {
      rawQuery: trimmed,
      normalizedQuery: lower,
      userRole: normalizedRole,
      displayRole: userRole,
      urgency,
      style,
      isOverviewRequest,
      isFollowUp,
      followUpStepNumber,
      matchedPatterns,
      context,
    }
  }
}
