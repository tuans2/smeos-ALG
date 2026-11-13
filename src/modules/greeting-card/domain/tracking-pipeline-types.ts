/**
 * Domain Types for Brochure Order & Session Tracking Pipeline.
 * Pure TypeScript — No Prisma or external infrastructure imports.
 */
import type { StuckInfo } from "./step-sla"

export type TrackingPipelineStepId =
  | "STEP_1_OPENED"
  | "STEP_2_CHOOSING"
  | "STEP_3_FILLING_FORM"
  | "STEP_4_PAYMENT_PENDING"
  | "STEP_5_PAYMENT_CONFIRMED"
  | "STEP_6_ARRANGING"
  | "STEP_7_READY_QC"
  | "STEP_8_DELIVERING"
  | "STEP_9_COMPLETED"


export interface StepDefinition {
  id: TrackingPipelineStepId
  title: string
  shortTitle: string
  roleResponsible: string
  orderIndex: number
}

const BASE_PIPELINE_STEPS: StepDefinition[] = [
  {
    id: "STEP_1_OPENED",
    title: "Khách mở link chào",
    shortTitle: "Mở link",
    roleResponsible: "Khách hàng / Sale",
    orderIndex: 1,
  },
  {
    id: "STEP_2_CHOOSING",
    title: "Đang lướt chọn sản phẩm",
    shortTitle: "Chọn mẫu",
    roleResponsible: "Khách hàng / Sale",
    orderIndex: 2,
  },
  {
    id: "STEP_3_FILLING_FORM",
    title: "Đang nhập Form Đặt ngay",
    shortTitle: "Nhập Form",
    roleResponsible: "Khách hàng / Sale",
    orderIndex: 3,
  },
  {
    id: "STEP_4_PAYMENT_PENDING",
    title: "Đã gửi đơn & Báo chuyển khoản",
    shortTitle: "Đã thanh toán",
    roleResponsible: "Khách hàng",
    orderIndex: 4,
  },
  {
    id: "STEP_5_PAYMENT_CONFIRMED",
    title: "Xác nhận tiền về tài khoản",
    shortTitle: "Xác nhận TT",
    roleResponsible: "Điều hành / Kế toán",
    orderIndex: 5,
  },
  {
    id: "STEP_6_ARRANGING",
    title: "Xưởng đang chế tác",
    shortTitle: "Đang chế tác",
    roleResponsible: "Điều phối / Nghệ nhân",
    orderIndex: 6,
  },
  {
    id: "STEP_7_READY_QC",
    title: "Sản phẩm hoàn thiện & Duyệt mẫu",
    shortTitle: "Đã hoàn thiện",
    roleResponsible: "Nghệ nhân / Điều phối",
    orderIndex: 7,
  },
  {
    id: "STEP_8_DELIVERING",
    title: "Đang giao hàng đến người nhận",
    shortTitle: "Đang giao",
    roleResponsible: "Shipper / Điều phối",
    orderIndex: 8,
  },
  {
    id: "STEP_9_COMPLETED",
    title: "Giao thành công & Hoàn tất",
    shortTitle: "Hoàn tất",
    roleResponsible: "Shipper / Toàn bộ",
    orderIndex: 9,
  },
]

const INDUSTRY_STEP_OVERRIDES: Record<
  string,
  Partial<Record<TrackingPipelineStepId, { title?: string; shortTitle?: string; roleResponsible?: string }>>
> = {
  HOMESTAY: {
    STEP_1_OPENED: { roleResponsible: "Khách hàng / Quản gia" },
    STEP_2_CHOOSING: { title: "Đang lướt xem hạng phòng", shortTitle: "Chọn phòng", roleResponsible: "Khách hàng / Quản gia" },
    STEP_3_FILLING_FORM: { title: "Đang nhập thông tin đặt phòng", shortTitle: "Nhập thông tin", roleResponsible: "Khách hàng / Quản gia" },
    STEP_4_PAYMENT_PENDING: { title: "Đã gửi đơn & Báo chuyển cọc", shortTitle: "Chờ cọc", roleResponsible: "Khách hàng" },
    STEP_6_ARRANGING: { title: "Đang chuẩn bị phòng & đón tiếp", shortTitle: "Chuẩn bị phòng", roleResponsible: "Quản gia / Lễ tân" },
    STEP_7_READY_QC: { title: "Phòng hoàn thiện & Sẵn sàng đón tiếp", shortTitle: "Phòng sẵn sàng", roleResponsible: "Quản gia / Lễ tân" },
    STEP_8_DELIVERING: { title: "Khách nhận phòng & Lưu trú", shortTitle: "Nhận phòng", roleResponsible: "Lễ tân / Quản gia" },
    STEP_9_COMPLETED: { title: "Hoàn tất kỳ lưu trú & Trả phòng", shortTitle: "Hoàn tất", roleResponsible: "Quản gia / Toàn bộ" },
  },
  FASHION: {
    STEP_2_CHOOSING: { title: "Đang lướt chọn mẫu thiết kế", shortTitle: "Chọn mẫu", roleResponsible: "Khách hàng / Sale" },
    STEP_6_ARRANGING: { title: "Xưởng đang may đo & lên mẫu", shortTitle: "May đo", roleResponsible: "Điều phối / Thợ may" },
    STEP_7_READY_QC: { title: "Trang phục hoàn thiện & Duyệt mẫu", shortTitle: "May xong", roleResponsible: "Thợ may / Điều phối" },
    STEP_8_DELIVERING: { title: "Đang giao hàng đến người nhận", shortTitle: "Đang giao", roleResponsible: "Shipper / Điều phối" },
  },
  FNB: {
    STEP_1_OPENED: { roleResponsible: "Khách hàng / Phục vụ" },
    STEP_2_CHOOSING: { title: "Đang xem thực đơn món", shortTitle: "Chọn món", roleResponsible: "Khách hàng / Phục vụ" },
    STEP_6_ARRANGING: { title: "Bếp đang chế biến & chuẩn bị", shortTitle: "Chế biến", roleResponsible: "Bếp / Pha chế" },
    STEP_7_READY_QC: { title: "Món ra đĩa & Hoàn tất chế biến", shortTitle: "Món sẵn sàng", roleResponsible: "Bếp / Phục vụ" },
    STEP_8_DELIVERING: { title: "Đang giao món / Phục vụ tại bàn", shortTitle: "Đang phục vụ", roleResponsible: "Shipper / Phục vụ" },
  },
  CRAFT_GIFT: {
    STEP_2_CHOOSING: { title: "Đang chọn mẫu quà tặng & thủ công", shortTitle: "Chọn mẫu", roleResponsible: "Khách hàng / Sale" },
    STEP_6_ARRANGING: { title: "Nghệ nhân đang chế tác & gia công", shortTitle: "Chế tác", roleResponsible: "Điều phối / Nghệ nhân" },
    STEP_7_READY_QC: { title: "Sản phẩm hoàn thiện & Duyệt mẫu", shortTitle: "Đã hoàn thành", roleResponsible: "Nghệ nhân / Điều phối" },
    STEP_8_DELIVERING: { title: "Đang giao quà đến người nhận", shortTitle: "Đang giao", roleResponsible: "Shipper / Điều phối" },
  },
  RETAIL_GENERAL: {
    STEP_2_CHOOSING: { title: "Đang xem danh mục sản phẩm", shortTitle: "Chọn sản phẩm", roleResponsible: "Khách hàng / Sale" },
    STEP_6_ARRANGING: { title: "Đang soạn hàng & đóng gói", shortTitle: "Soạn hàng", roleResponsible: "Kho / Đóng gói" },
    STEP_7_READY_QC: { title: "Đóng gói hoàn tất & Sẵn sàng giao", shortTitle: "Đã đóng gói", roleResponsible: "Kho / Điều phối" },
    STEP_8_DELIVERING: { title: "Đang giao hàng đến người nhận", shortTitle: "Đang giao", roleResponsible: "Shipper / Điều phối" },
  },
  SERVICES: {
    STEP_1_OPENED: { roleResponsible: "Khách hàng / Chuyên viên" },
    STEP_2_CHOOSING: { title: "Đang chọn gói dịch vụ", shortTitle: "Chọn dịch vụ", roleResponsible: "Khách hàng / Chuyên viên" },
    STEP_6_ARRANGING: { title: "Đang chuẩn bị triển khai dịch vụ", shortTitle: "Chuẩn bị", roleResponsible: "Kỹ thuật viên / Chuyên viên" },
    STEP_7_READY_QC: { title: "Hoàn tất triển khai & Nghiệm thu", shortTitle: "Nghiệm thu", roleResponsible: "Kỹ thuật viên / Chuyên viên" },
    STEP_8_DELIVERING: { title: "Đang thực hiện dịch vụ", shortTitle: "Thực hiện", roleResponsible: "Kỹ thuật viên" },
  },
}

/**
 * Trả về 9 bước tiến độ được điều chỉnh nhãn và vai trò phù hợp với từng ngành SSOT.
 */
export function getIndustryPipelineSteps(industryKey?: string | null): StepDefinition[] {
  const overrides = INDUSTRY_STEP_OVERRIDES[(industryKey ?? "").toUpperCase()]
  if (!overrides) return BASE_PIPELINE_STEPS

  return BASE_PIPELINE_STEPS.map((step) => {
    const patch = overrides[step.id]
    if (!patch) return step
    return {
      ...step,
      ...(patch.title ? { title: patch.title } : {}),
      ...(patch.shortTitle ? { shortTitle: patch.shortTitle } : {}),
      ...(patch.roleResponsible ? { roleResponsible: patch.roleResponsible } : {}),
    }
  })
}

export const PIPELINE_STEPS: StepDefinition[] = BASE_PIPELINE_STEPS



export interface TrackingStepState {
  id: TrackingPipelineStepId
  title: string
  shortTitle: string
  roleResponsible: string
  orderIndex: number
  status: "completed" | "current" | "pending"
  completedAt?: string | null | undefined
}

export interface TrackingPipelineItem {
  id: string
  type: "ORDER" | "SESSION"
  orderId?: string | null | undefined
  sessionId: string
  orderCode?: string | null | undefined
  sendCode: string
  catalogName: string
  customerName: string
  customerPhone: string
  recipientName?: string | null | undefined
  recipientPhone?: string | null | undefined
  deliveryAddress?: string | null | undefined
  deliveryDate?: string | null | undefined
  deliveryTimeSlot?: string | null | undefined
  /** Khu vực giao khách chọn (theo bảng phí giao của tiệm) */
  deliveryZone?: string | null | undefined
  /** Lần giao gần nhất không thành công — chờ giao lại */
  deliveryFailed?: boolean | undefined
  /** Sale phụ trách = người tạo/gửi link; link dùng chung → "Link dùng chung" */
  saleName: string
  cardMessage?: string | null | undefined
  productName: string
  productPrice: number
  productImageUrl?: string | null | undefined
  totalVnd: number
  paidVnd: number
  balanceVnd: number
  currentStepId: TrackingPipelineStepId
  currentStepTitle: string
  /** Trạng thái đơn hàng (DRAFT | CONFIRMED | CANCELLED | COMPLETED) */
  orderStatus?: string | null | undefined
  /** Trạng thái phiên Thẻ chào (ORDER_SUBMITTED | PAYMENT_REPORTED | COMPLETED...) */
  sessionStatus?: string | null | undefined
  /** Khách đã bấm Tôi đã chuyển khoản — đang chờ xác nhận */
  customerReportedPaid?: boolean | undefined
  /** Ảnh chuyển khoản lần 1 do khách tải lên */
  paymentProofUrl?: string | null | undefined
  paymentProofAnalysis?: import("./payment-proof-analysis").PaymentProofAnalysisResult | null | undefined
  /** Ảnh chuyển khoản lần 2 do khách tải lên */
  paymentProofBalanceUrl?: string | null | undefined
  paymentProofBalanceAnalysis?: import("./payment-proof-analysis").PaymentProofAnalysisResult | null | undefined
  /** Trạng thái sản xuất (WAITING | ASSIGNED | ARRANGING | QUALITY_CHECK | READY) */
  productionStatus?: string | null | undefined
  /** Trạng thái giao hàng (PENDING | DISPATCHED | DELIVERING | DELIVERED | FAILED) */
  deliveryStatus?: string | null | undefined
  /** Lúc vào bước hiện tại (để tính quá thời gian chuẩn). */
  stepStartedAt: string
  /** Quá thời gian chuẩn của bước hiện tại — `null` = đang đúng tiến độ. */
  stuck: StuckInfo | null
  /** Sale phụ trách (người gửi link); "public" = link bộ sưu tập công khai. */
  saleId: string | null
  /** Điều phối phụ trách (khi đơn chuyển sang giai đoạn điều phối) */
  coordinatorId?: string | null | undefined
  /** Tên điều phối phụ trách */
  coordinatorName?: string | null | undefined
  /** Khách đến từ đâu: "Link riêng của sale" hoặc kênh chia sẻ link bộ sưu tập (Zalo, Facebook…, "Trực tiếp"). */
  channel: string
  /** PERSONAL = link riêng sale tạo · SHARED = link bộ sưu tập sao chép · LEGACY = link cũ không qua nút Sao chép. */
  linkKind: "PERSONAL" | "SHARED" | "LEGACY"
  /** Lần sao chép đầu tiên của link riêng (`null` = chưa gửi khách). */
  copiedAt: string | null
  /** Hạn dùng của link (chỉ với link chưa thành đơn). */
  expiresAt: string | null
  /** Đã huỷ / hết hạn / quá hạn */
  isCancelled?: boolean | undefined
  /** Lý do huỷ / quá hạn (ví dụ: Tự huỷ quá hạn mở link, Tự huỷ quá hạn chuyển khoản cọc,...) */
  cancelReason?: string | null | undefined
  /** Thông tin đề xuất / quyết định hủy bỏ hiển thị (nếu có) */
  dismissal?: import("./dismissal-policy").DismissalInfo | undefined
  steps: TrackingStepState[]
  lastActiveAt: string
  /** Lúc khách mở link lần đầu (chỉ với link chưa thành đơn). */
  openedAt?: string | null | undefined
  createdAt: string
}
