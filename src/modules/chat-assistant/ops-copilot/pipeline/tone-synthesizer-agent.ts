/**
 * Agent 3: Tone & Copywriting Synthesizer Agent — LLM Edition.
 *
 * Chuyên trách tổng hợp câu trả lời tự nhiên bằng cách đưa FactSheet vào LLM,
 * yêu cầu trả lời theo văn phong nhân viên cửa hàng Việt Nam thực thụ.
 *
 * Gọi mô hình chỉ qua cổng AI (`ChatAnswerFn` → `callCapability("chat_answer")`); cổng chọn
 * mô hình theo chính sách tiệm. Không gọi được → mẫu tĩnh.
 */

import type { ParsedIntent, KnowledgeFactSheet, PolishedDraft } from "./pipeline-types"
import type { ChatAnswerFn } from "../../adapters/chat-answer-gateway"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Làm sạch thuật ngữ kỹ thuật trước khi đưa vào context LLM hoặc fallback */
function purifyDevJargon(text: string): string {
  return text
    .replace(/\s*->\s*/g, ", sau đó ")
    .replace(/\s*\(icon\s+[A-Za-z0-9_-]+\s*(?:trên Header)?\)/gi, "")
    .replace(/\(SlidersHorizontal\)/gi, "")
    .replace(/\(Wand2\)/gi, "")
    .replace(/\(LayoutList\)/gi, "")
    .replace(/\(InboxButton\)/gi, "")
    .replace(/JourneyWizard\s*/gi, "luồng ")
    .replace(/TrashConfirmModal/gi, "hộp thoại xác nhận")
    .replace(/AnalysisResultCard/gi, "bảng kết quả")
    .replace(/In-place Editing/gi, "chỉnh sửa trực tiếp")
    .replace(/FlowSteps/gi, "các bước trên màn hình")
    .replace(/ShopProfileReadiness/gi, "hệ thống")
    .replace(/AccountStorageHub/gi, "kho dữ liệu")
    .replace(/AddStaffDialog/gi, "hộp thoại thêm nhân viên")
    .replace(/MemberTable/gi, "danh sách nhân viên")
    .replace(/Cursor-based Pagination/gi, "tự động tải trang")
    .replace(/\(isExecutive[^)]*\)/gi, "")
    .replace(/\(isExecutive\)/gi, "")
    .replace(/\(Quyền [A-Za-z0-9_-]+\)/gi, "")
    .replace(/Search Box/gi, "ô tìm kiếm")
    .replace(/Dropzone 1/gi, "khung Excel")
    .replace(/Dropzone 2/gi, "khung Ảnh")
    .replace(/import-session-storage/gi, "bộ nhớ tạm")
    .replace(/importStats/gi, "thống kê")
    .replace(/\('\/[^']+'\)/g, "")
    .replace(/'\/[^']+'/g, "")
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  return `Bạn là Trợ lý Vận hành smeOS — nhân viên hỗ trợ nội bộ của cửa hàng.
Nhiệm vụ: Trả lời câu hỏi của chủ tiệm / nhân viên về cách sử dụng phần mềm smeOS.

QUY TẮC BẮT BUỘC:
- Viết hoàn toàn bằng tiếng Việt, ấm áp, lịch sự như đồng nghiệp thân thiện.
- TUYỆT ĐỐI không dùng mã kỹ thuật, tên component, đường dẫn file, ký hiệu lập trình.
- Không dùng markdown bold (**) quá nhiều — chỉ in đậm tên tính năng chính (tối đa 2-3 lần).
- Không liệt kê quá 5 bước; nếu nhiều hơn, gộp các bước nhỏ vào nhau.
- Không mở đầu bằng "Dạ" nếu đã có lời chào ở trước.
- Kết thúc bằng 1 câu khích lệ hoặc gợi mở hành động tiếp theo ngắn gọn.
- Độ dài tối đa: 150 từ.`
}

function buildUserPrompt(intent: ParsedIntent, facts: KnowledgeFactSheet): string {
  // Nếu không tìm thấy node → hỏi lại
  if (!facts.nodeId) {
    return `Người dùng hỏi: "${intent.rawQuery}"
Hệ thống chưa tìm thấy hướng dẫn phù hợp.
Hãy trả lời thân thiện, thừa nhận chưa rõ và gợi ý người dùng đặt lại câu hỏi cụ thể hơn (ví dụ: tên tính năng, thao tác muốn làm).`
  }

  // Tổng hợp FactSheet thành context ngắn gọn
  const stepsContext = facts.steps
    .map((s) => `Bước ${s.stepNumber}: ${purifyDevJargon(s.actionText)}`)
    .join("\n")

  const caveatsContext = facts.caveats.length > 0
    ? `\nLưu ý quan trọng: ${facts.caveats.slice(0, 2).map(purifyDevJargon).join("; ")}`
    : ""

  const relatedContext = facts.relatedLinks.length > 0
    ? `\nTính năng liên quan: ${facts.relatedLinks[0]!.title}`
    : ""

  return `Người dùng hỏi: "${intent.rawQuery}"
Tính năng: ${facts.topicTitle ?? facts.moduleTitle ?? "smeOS"}
Tóm tắt: ${facts.summary}

Các bước thực hiện:
${stepsContext}${caveatsContext}${relatedContext}

Hãy trả lời câu hỏi trên theo đúng thông tin trên bằng ngôn ngữ tự nhiên, không liệt kê máy móc.`
}

// ---------------------------------------------------------------------------
// Template fallback (giữ lại để đảm bảo unit tests không phụ thuộc LLM)
// ---------------------------------------------------------------------------

function templateFallback(intent: ParsedIntent, facts: KnowledgeFactSheet): PolishedDraft {
  if (facts.isOverview && facts.overviewItems) {
    const greeting = intent.userRole !== "ALL"
      ? `Dạ em là smeOS Ops Copilot — Trợ lý vận hành đồng hành cùng anh/chị (${intent.userRole})!`
      : "Dạ em là smeOS Ops Copilot — Trợ lý vận hành nền tảng smeOS của cửa hàng!"

    const bodyText = `${greeting} Em có thể hướng dẫn anh/chị thao tác 11 chức năng chính của tiệm:\n\n` +
      `1. **Trang Chủ:** Xem việc cần làm đầu ngày, theo dõi đơn tồn và hạn mức AI.\n` +
      `2. **Đơn Hàng & Xưởng:** Quản lý tiến độ đơn, in phiếu chế tác giấu giá và phiếu giao cho shipper.\n` +
      `3. **Bộ sưu tập riêng:** Tạo link xem hoa gửi Zalo cho khách và nhận cọc tự động qua mã QR.\n` +
      `4. **Sản Phẩm & Giá:** Quản lý bảng giá niêm yết, tra cứu mẫu theo dịp và khoảng giá.\n` +
      `5. **Tạo Sản Phẩm Mới:** Đăng sản phẩm mới, ghi rõ số thành phần để thợ chế tác chuẩn mẫu.\n` +
      `6. **Nhập từ Excel:** Nạp hàng loạt sản phẩm cũ và tải ảnh nhanh chóng.\n` +
      `7. **Quét Ảnh Hoa AI & Phân tích hoa:** Nhận diện nguyên liệu, đếm cành và soạn sẵn tin nhắn Zalo chốt đơn.\n` +
      `8. **Kho Dữ Liệu:** Lưu trữ ảnh hoa của tiệm và quản lý thùng rác 30 ngày.\n` +
      `9. **Hồ Sơ Cửa Hàng:** Cài đặt thông tin tiệm, logo và số tài khoản ngân hàng nhận tiền cọc.\n` +
      `10. **Cài Đặt & Thành Viên:** Cấp tài khoản nhân viên dùng ngay trong 10 giây và phân quyền.\n` +
      `11. **Khách Hàng — Dữ Liệu Cá Nhân:** Xuất bản sao, sửa hoặc xoá dữ liệu khi khách yêu cầu.\n\n` +
      `Anh/chị đang cần hỗ trợ thao tác phần nào ạ?`

    return { greeting, bodyText, targetRoute: "/", actionLabel: "Khám Phá Các Chức Năng" }
  }

  if (!facts.nodeId) {
    const roleNote = intent.userRole !== "ALL" ? ` (${intent.userRole})` : ""
    const bodyText = `Dạ, em chưa nhận diện được thao tác cụ thể trong câu hỏi của anh/chị${roleNote}.\n\n` +
      `Anh/chị có thể miêu tả việc muốn làm để em hướng dẫn từng bước nhé. Ví dụ:\n` +
      `• *"Tạo link sản phẩm gửi Zalo cho khách"*\n` +
      `• *"In phiếu chế tác giấu giá cho thợ"*\n` +
      `• *"Có cần gửi ảnh khi chế tác xong không"*\n` +
      `• *"Cài đặt số tài khoản nhận tiền cọc"*\n` +
      `• *"Thêm tài khoản cho nhân viên mới"*\n\n` +
      `Anh/chị cứ gõ câu hỏi, em sẽ hướng dẫn chi tiết ngay ạ!`

    return {
      greeting: "Dạ em xin phép hỗ trợ anh/chị ạ!",
      bodyText,
      targetRoute: "/the-chao",
      actionLabel: "Xem hướng dẫn Bộ sưu tập riêng",
    }
  }

  if (facts.focusedStep) {
    const step = facts.focusedStep
    const cleanStepText = purifyDevJargon(step.actionText)
    const bodyText = `Dạ, em hướng dẫn chi tiết **Bước ${step.stepNumber}** trong phần **${facts.topicTitle}** nhé:\n\n` +
      `👉 ${cleanStepText}\n\n` +
      `Anh/chị bấm nút bên dưới để mở màn hình và thao tác ngay nhé ạ!`

    return {
      greeting: `Chi tiết Bước ${step.stepNumber}`,
      bodyText,
      targetRoute: facts.routePath ?? undefined,
      actionLabel: facts.actionLabel ?? undefined,
      actionSteps: [cleanStepText],
      relatedLinks: facts.relatedLinks,
    }
  }

  const stepsFormatted = facts.steps.map((s) => {
    const cleanAction = purifyDevJargon(s.actionText).replace(/^Bước\s*\d+\s*[-:]\s*/i, "").trim()
    if (cleanAction.includes(":")) {
      const parts = cleanAction.split(":")
      const header = parts[0]?.trim()
      const desc = parts.slice(1).join(":").trim()
      return `${s.stepNumber}. **${header}:** ${desc}`
    }
    return `${s.stepNumber}. ${cleanAction}`
  })
  const stepsText = stepsFormatted.join("\n")

  const rawCaveat = facts.caveats.length > 0 ? facts.caveats[0]! : ""
  const cleanCaveat = purifyDevJargon(rawCaveat)
  const primaryCaveat = cleanCaveat ? `\n\n💡 **Lưu ý nghiệp vụ:** ${cleanCaveat}` : ""

  const crossModuleBlock = facts.relatedLinks.length > 0
    ? `\n🔗 **Liên kết nghiệp vụ liên quan:** [${facts.relatedLinks[0]!.title}](${facts.relatedLinks[0]!.route})`
    : ""

  let greeting = ""
  let bodyText = ""

  switch (intent.style) {
    case "CONSULTANT": {
      greeting = `**[Cố vấn Vận hành smeOS]**`
      bodyText = `${greeting} Hướng dẫn **${facts.topicTitle}**:\n\n` +
        `${stepsText}${primaryCaveat}${crossModuleBlock}\n\n` +
        `💡 *Khuyến nghị quản trị:* Thực hiện đúng các bước trên để tối ưu thời gian và đối soát.`
      break
    }
    case "TROUBLESHOOTER": {
      greeting = `🔧 **[Khắc phục Sự cố & Hướng dẫn Xử lý Nhanh]**`
      bodyText = `${greeting}\n` +
        `Xử lý nhanh **${facts.topicTitle}** theo các bước sau:\n\n` +
        `${stepsText}${primaryCaveat}${crossModuleBlock}`
      break
    }
    case "FAST_SOP": {
      greeting = `⚡ **[Thao tác Nhanh] ${facts.topicTitle}:**`
      bodyText = `${greeting}\n\n${stepsText}${crossModuleBlock}`
      break
    }
    case "COACH":
    default: {
      const roleName = intent.displayRole || (intent.userRole !== "ALL" ? intent.userRole : "")
      const roleGreeting = roleName ? ` (${roleName})` : ""
      greeting = `Dạ, em xin phép hướng dẫn anh/chị thao tác **"${facts.topicTitle}"**${roleGreeting}:`
      bodyText = `${greeting}\n\n${stepsText}${primaryCaveat}${crossModuleBlock}`
      break
    }
  }

  return {
    greeting,
    bodyText,
    targetRoute: facts.routePath ?? undefined,
    actionLabel: facts.actionLabel ?? undefined,
    actionSteps: facts.steps.map((s) => purifyDevJargon(s.actionText)),
    relatedLinks: facts.relatedLinks,
  }
}

// ---------------------------------------------------------------------------
// ToneSynthesizerAgent
// ---------------------------------------------------------------------------

export class ToneSynthesizerAgent {
  /** `answer` gọi AI qua cổng (`chatAnswerViaGateway`); không truyền → luôn dùng mẫu tĩnh. */
  constructor(private readonly answer?: ChatAnswerFn | undefined) {}

  /**
   * Tổng hợp câu trả lời qua cổng AI → mẫu tĩnh khi không gọi được mô hình.
   * Luôn trả về kết quả — không bao giờ throw.
   */
  async synthesize(intent: ParsedIntent, facts: KnowledgeFactSheet): Promise<PolishedDraft> {
    // Các trường hợp đặc biệt không cần LLM (overview, unresolved) → template ngay
    if (facts.isOverview || !facts.nodeId || !this.answer) {
      return templateFallback(intent, facts)
    }

    const reply = await this.answer({ system: buildSystemPrompt(), prompt: buildUserPrompt(intent, facts), maxTokens: 300 })
    return reply ? buildPolishedDraft(reply, intent, facts) : templateFallback(intent, facts)
  }
}

/** Đóng gói câu trả lời LLM vào PolishedDraft với metadata đầy đủ */
function buildPolishedDraft(
  llmText: string,
  intent: ParsedIntent,
  facts: KnowledgeFactSheet
): PolishedDraft {
  const crossModuleBlock = facts.relatedLinks.length > 0
    ? `\n\n🔗 **Liên kết nghiệp vụ liên quan:** [${facts.relatedLinks[0]!.title}](${facts.relatedLinks[0]!.route})`
    : ""

  return {
    greeting: "",
    bodyText: llmText + crossModuleBlock,
    targetRoute: facts.routePath ?? undefined,
    actionLabel: facts.actionLabel ?? undefined,
    actionSteps: facts.steps.map((s) => purifyDevJargon(s.actionText)),
    relatedLinks: facts.relatedLinks,
  }
}
