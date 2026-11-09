/**
 * Ops Knowledge Base Registry & Query Engine.
 * Quản lý tập trung 10 Module Tri thức SSOT và cung cấp bộ máy tìm kiếm theo vai trò.
 */

import type { OpsKnowledgeNode, OpsResponseStyle, OpsTargetRole } from "./schema"
import { NODE_01_TRANG_CHU } from "./node-01-trang-chu"
import { NODE_02_DON_HANG } from "./node-02-don-hang"
import { NODE_03_THE_CHAO } from "./node-03-the-chao"
import { NODE_04_SAN_PHAM_VA_GIA } from "./node-04-san-pham-va-gia"
import { NODE_05_TAO_MAU_HOA_MOI } from "./node-05-tao-mau-hoa-moi"
import { NODE_06_NHAP_HANG_LOAT } from "./node-06-nhap-hang-loat"
import { NODE_07_QUET_ANH_AI } from "./node-07-quet-anh-ai"
import { NODE_08_KHO_DU_LIEU } from "./node-08-kho-du-lieu"
import { NODE_09_HO_SO_CUA_HANG } from "./node-09-ho-so-cua-hang"
import { NODE_10_CAI_DAT_THANH_VIEN } from "./node-10-cai-dat-thanh-vien"

export * from "./schema"
export * from "./knowledge-graph"

export const OPS_KNOWLEDGE_BASE: OpsKnowledgeNode[] = [
  NODE_01_TRANG_CHU,
  NODE_02_DON_HANG,
  NODE_03_THE_CHAO,
  NODE_04_SAN_PHAM_VA_GIA,
  NODE_05_TAO_MAU_HOA_MOI,
  NODE_06_NHAP_HANG_LOAT,
  NODE_07_QUET_ANH_AI,
  NODE_08_KHO_DU_LIEU,
  NODE_09_HO_SO_CUA_HANG,
  NODE_10_CAI_DAT_THANH_VIEN,
]

/**
 * Chuẩn hóa vai trò người dùng về OpsTargetRole
 */
export function normalizeUserRole(role?: string): OpsTargetRole {
  if (!role) return "ALL"
  const lower = role.toLowerCase()
  if (lower.includes("quản lý") || lower.includes("manager") || lower.includes("admin") || lower.includes("điều hành")) {
    return "QUAN_LY"
  }
  if (lower.includes("bán hàng") || lower.includes("sales") || lower.includes("sale")) {
    return "BAN_HANG"
  }
  if (lower.includes("thợ chế tác") || lower.includes("florist") || lower.includes("thợ")) {
    return "THO_CAM"
  }
  if (lower.includes("giao hàng") || lower.includes("shipper") || lower.includes("điều phối")) {
    return "GIAO_HANG"
  }
  return "ALL"
}

/**
 * Tự động xác định Phong cách phản hồi (Adaptive Persona Style)
 */
export function detectResponseStyle(query: string, userRole?: string): OpsResponseStyle {
  const lower = query.toLowerCase()

  // 1. Ưu tiên Kỹ thuật viên Khắc phục Sự cố nếu phát hiện từ khóa lỗi
  const troubleKeywords = ["lỗi", "không hiện", "bị khóa", "thất bại", "tại sao không", "không tải được", "cảnh báo", "không được"]
  if (troubleKeywords.some((kw) => lower.includes(kw))) {
    return "TROUBLESHOOTER"
  }

  // 2. Ưu tiên Tóm tắt Siêu tốc nếu người dùng cần gấp
  const fastKeywords = ["nhanh", "gấp", "tóm tắt", "vắn tắt", "ngắn gọn"]
  if (fastKeywords.some((kw) => lower.includes(kw))) {
    return "FAST_SOP"
  }

  // 3. Phân tầng theo vai trò người dùng
  const normalizedRole = normalizeUserRole(userRole)
  if (normalizedRole === "QUAN_LY") {
    return "CONSULTANT" // Chuyên gia Cố vấn Vận hành
  }

  // Mặc định là Hướng dẫn viên Cầm tay chỉ việc cho nhân viên
  return "COACH"
}

// Action Intent Mappings: Ánh xạ các cụm động từ + danh từ tự nhiên vào thẳng Node tri thức
const ACTION_INTENT_MAP: Array<{ patterns: string[]; nodeId: string }> = [
  {
    patterns: [
      "bộ sưu tập", "tạo thẻ", "thẻ chào", "bộ sưu tập riêng", "tạo bộ sưu tập", "thẻ bộ sưu tập",
      "link chào", "link gửi khách", "gửi zalo", "chọn hoa", "cọc tiền", "đặt cọc",
      "vietqr cọc", "phễu cọc", "duyệt cọc", "brochure", "link đặt hàng", "gửi nhanh",
      "journeywizard", "inboxbutton", "hộp việc", "shopprofilereadiness"
    ],
    nodeId: "node-03-the-chao",
  },
  {
    patterns: [
      "đơn hàng", "in phiếu", "phiếu xưởng", "phiếu chế tác", "thợ chế tác", "giấu giá",
      "ẩn giá", "phiếu giao", "in thiệp", "khổ A6", "kanban", "sla", "chậm đơn",
      "trễ đơn", "tiến độ đơn", "xác nhận tiền về", "đối soát cọc",
      "gửi ảnh", "ảnh hoàn thành", "ảnh thành phẩm", "số lượng ảnh", "duyệt ảnh",
      "ảnh tp", "ảnh nhận", "nghiệm thu ảnh", "hoàn thành sản phẩm",
      "tạo từ chat", "dán tin nhắn", "trích xuất chat", "tab 3", "duyệt tt thẻ chào",
      "xác nhận đã nhận tiền", "bỏ qua ảnh", "10 phút", "đếm ngược 10 phút"
    ],
    nodeId: "node-02-don-hang",
  },
  {
    patterns: [
      "tạo hoa mới", "tạo sản phẩm", "thêm sản phẩm", "công thức cành", "bóc tách cành",
      "bom", "atomic bom", "thành phần", "kiểu dáng", "giá vốn", "costing", "tính giá hoa",
      "fl-xxxx", "lưu và xuất bản", "vai trò cành"
    ],
    nodeId: "node-05-tao-mau-hoa-moi",
  },
  {
    patterns: [
      "nhập excel", "import excel", "file excel", "bảng tính", "kéo thả kép",
      "dropzone", "khớp ảnh", "tải hàng loạt", "nhập hàng loạt", "danh mục lớn",
      "file mẫu excel", "importstats", "import-session-storage"
    ],
    nodeId: "node-06-nhap-hang-loat",
  },
  {
    patterns: [
      "quét ảnh", "phân tích hoa", "ai thị giác", "vision", "đếm cành",
      "nhận diện hoa", "kịch bản zalo", "bài viết bán hàng", "chốt đơn zalo",
      "m01a", "m01b", "m01c", "flowsteps", "tái sử dụng mẫu", "approvedanalysesselector",
      "idempotency key", "tiết kiệm credit"
    ],
    nodeId: "node-07-quet-anh-ai",
  },
  {
    patterns: [
      "kho dữ liệu", "kho ảnh", "ảnh gốc", "ảnh đã duyệt", "thùng rác",
      "khôi phục ảnh", "xóa ảnh", "tài nguyên số", "accountstoragehub",
      "raw", "approved", "finalized", "xóa vĩnh viễn"
    ],
    nodeId: "node-08-kho-du-lieu",
  },
  {
    patterns: [
      "hồ sơ", "thông tin tiệm", "tài khoản ngân hàng", "stk", "ngân hàng thụ hưởng",
      "logo tiệm", "bảng màu tiệm", "tỷ lệ cọc", "chính sách cọc", "napas 247",
      "bảng màu ngũ hành", "mức cọc", "tự hủy đơn"
    ],
    nodeId: "node-09-ho-so-cua-hang",
  },
  {
    patterns: [
      "cài đặt", "thêm nhân viên", "quản lý nhân viên", "tạo tài khoản", "phân quyền",
      "cấp mật khẩu", "khóa tài khoản", "xóa nhân viên", "nghỉ việc",
      "addstaffdialog", "cấp tài khoản 10s", "không cần email", "chống tự khóa"
    ],
    nodeId: "node-10-cai-dat-thanh-vien",
  },
  {
    patterns: [
      "bảng giá", "giá hoa", "danh mục hoa", "sản phẩm đang bán", "lọc hoa",
      "khoảng giá", "tìm hoa theo dịp", "thùng rác sản phẩm", "trashconfirmmodal",
      "mã hoa", "debounce"
    ],
    nodeId: "node-04-san-pham-va-gia",
  },
  {
    patterns: [
      "trang chủ", "dashboard", "bàn làm việc", "chế độ chuyên gia", "growth center",
      "việc tồn đọng", "credit ai", "hạn mức ai", "choicegrid", "storegrowthcenter",
      "bạn muốn làm gì", "job lỗi", "cần can thiệp"
    ],
    nodeId: "node-01-trang-chu",
  },
]

/**
 * Tra cứu tri thức vận hành hệ thống kết hợp chấm điểm từ khóa và vai trò người dùng
 */
export function queryOpsKnowledge(query: string, userRole?: string): OpsKnowledgeNode | null {
  const lower = query.toLowerCase().trim()
  if (!lower) return null

  // 1. Kiểm tra nhanh qua Action Intent Mapping (Trọng số ưu tiên cao nhất)
  for (const mapping of ACTION_INTENT_MAP) {
    for (const pattern of mapping.patterns) {
      if (lower.includes(pattern)) {
        const matched = OPS_KNOWLEDGE_BASE.find((n) => n.id === mapping.nodeId)
        if (matched) return matched
      }
    }
  }

  const targetRole = normalizeUserRole(userRole)
  let bestMatch: OpsKnowledgeNode | null = null
  let maxScore = 0

  for (const node of OPS_KNOWLEDGE_BASE) {
    let score = 0

    // 2. Điểm khớp từ khóa (15 điểm mỗi cụm từ)
    for (const kw of node.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += 15
      }
    }

    // 3. Điểm khớp tiêu đề chủ đề hoặc phân hệ (30 điểm)
    if (lower.includes(node.topicTitle.toLowerCase()) || lower.includes(node.moduleTitle.toLowerCase())) {
      score += 30
    }

    // 4. Điểm khớp ý định thao tác (20 điểm)
    for (const intent of node.intents) {
      const intentWords = intent.split("_")
      if (intentWords.every((w) => lower.includes(w))) {
        score += 20
      }
    }

    // 5. Role-based Reranking: Cộng thêm 10 điểm nếu phân hệ tối ưu cho vai trò này
    if (targetRole !== "ALL" && (node.targetRoles.includes(targetRole) || node.targetRoles.includes("ALL"))) {
      score += 10
    }

    if (score > maxScore) {
      maxScore = score
      bestMatch = node
    }
  }

  // Ngưỡng phát hiện hợp lệ: ít nhất 10 điểm
  return maxScore >= 10 ? bestMatch : null
}

/**
 * Lấy danh sách câu hỏi nhanh tiêu biểu của cả 10 phân hệ
 */
export function listAllQuickPrompts(): string[] {
  const prompts: string[] = []
  for (const node of OPS_KNOWLEDGE_BASE) {
    if (node.quickPrompts && node.quickPrompts.length > 0) {
      prompts.push(node.quickPrompts[0]!)
    }
  }
  return prompts
}
