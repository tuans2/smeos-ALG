/**
 * VietQR PRO Payment & AI Credit Top-up Engine (PAY-01 -> PAY-05).
 * Pure TypeScript Domain - Không phụ thuộc Prisma hay UI.
 * Sinh payload VietQR chuẩn Napas 247, cú pháp định danh đối soát và tính toán credit bonus.
 */

export interface SubscriptionPlan {
  id: string
  code: string
  name: string
  priceMonthlyVnd: number
  includedCreditsMonthly: number
  description: string
  features: string[]
  isPopular?: boolean | undefined
}

export interface CreditTopupOption {
  id: string
  code: string
  priceVnd: number
  baseCredits: number
  bonusCredits: number
  totalCredits: number
  discountPercent?: number | undefined
  isBestValue?: boolean | undefined
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "plan-starter",
    code: "STARTER",
    name: "Gói Khởi Nghiệp",
    priceMonthlyVnd: 299_000,
    includedCreditsMonthly: 300,
    description: "Dành cho shop hoa mới mở, phục vụ nhu cầu bán hàng & đăng bài cơ bản",
    features: [
      "Quản lý đơn hàng & in phiếu A6",
      "300 Credit AI/tháng (~60 ảnh / 15 video ngắn)",
      "Catalog trực tuyến & Báo giá thông minh",
      "Hỗ trợ 1 chi nhánh",
    ],
  },
  {
    id: "plan-growth",
    code: "GROWTH",
    name: "Gói Tăng Trưởng",
    priceMonthlyVnd: 599_000,
    includedCreditsMonthly: 800,
    description: "Gói bán chạy nhất — Tự động hóa tiếp thị, CRM chăm sóc và studio AI",
    features: [
      "Toàn bộ quyền lợi gói Khởi Nghiệp",
      "800 Credit AI/tháng (~160 ảnh / 40 video ngắn)",
      "Studio 5 Tone giọng & Tự động sinh kịch bản",
      "Chăm sóc tự động ngày kỷ niệm Zalo",
      "Hỗ trợ 3 nhân viên truy cập",
    ],
    isPopular: true,
  },
  {
    id: "plan-enterprise",
    code: "PRO",
    name: "Chuỗi / Mạng Lưới Điện Hoa",
    priceMonthlyVnd: 1_299_000,
    includedCreditsMonthly: 2_000,
    description: "Giải pháp toàn diện cho mạng lưới điều phối điện hoa và chuỗi cửa hàng",
    features: [
      "Toàn bộ quyền lợi gói Tăng Trưởng",
      "2.000 Credit AI/tháng (~400 ảnh / 100 video)",
      "Tháp điều phối Control Tower & Giám sát SLA",
      "Sổ cái đối soát tài chính xưởng ngoài",
      "Không giới hạn tài khoản nhân viên",
    ],
  },
]

export const CREDIT_TOPUP_OPTIONS: CreditTopupOption[] = [
  {
    id: "topup-100",
    code: "CR100",
    priceVnd: 100_000,
    baseCredits: 100,
    bonusCredits: 20,
    totalCredits: 120, // +20% bonus
  },
  {
    id: "topup-200",
    code: "CR200",
    priceVnd: 200_000,
    baseCredits: 200,
    bonusCredits: 60,
    totalCredits: 260, // +30% bonus
    isBestValue: true,
  },
  {
    id: "topup-500",
    code: "CR500",
    priceVnd: 500_000,
    baseCredits: 500,
    bonusCredits: 250,
    totalCredits: 750, // +50% bonus
    discountPercent: 15,
  },
]

export interface BankConfig {
  bankBin: string // vd: "970422" (MBBank)
  bankName: string // MB Bank
  accountNumber: string
  accountHolder: string
}

export const DEFAULT_PLATFORM_BANK: BankConfig = {
  bankBin: "970422",
  bankName: "MB Bank (Ngân hàng Quân Đội)",
  accountNumber: "0388889999",
  accountHolder: "CONG TY CONG NGHE ALG",
}

export interface GenerateVietQrInput {
  orgCode: string
  amountVnd: number
  packageCode: string
  itemType: "CREDIT_TOPUP" | "PLAN_SUBSCRIPTION"
  bankConfig?: BankConfig | undefined
}

export interface VietQrPayload {
  bankName: string
  bankBin: string
  accountNumber: string
  accountHolder: string
  amountVnd: number
  transferSyntax: string
  qrImageUrl: string
  expiresAt: string // ISO string
}

/**
 * Sinh cú pháp chuyển khoản định danh đối soát tự động: FLO_{ORG}_{CODE}_{SUFFIX}
 */
export function generateTransferSyntax(orgCode: string, packageCode: string): string {
  const cleanOrg = orgCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)
  const cleanPkg = packageCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  return `FLO ${cleanOrg} ${cleanPkg} ${randomSuffix}`
}

/**
 * Tạo URL mã VietQR QuickLink chuẩn Napas 247
 */
export function buildVietQrImageUrl(
  bankBin: string,
  accountNumber: string,
  amountVnd: number,
  transferSyntax: string,
  accountHolder: string,
): string {
  const encodedInfo = encodeURIComponent(transferSyntax)
  const encodedName = encodeURIComponent(accountHolder)
  return `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?amount=${amountVnd}&addInfo=${encodedInfo}&accountName=${encodedName}`
}

/**
 * Tạo payload hoàn chỉnh cho giao dịch VietQR
 */
export function createVietQrTransaction(input: GenerateVietQrInput): VietQrPayload {
  const bank = input.bankConfig ?? DEFAULT_PLATFORM_BANK
  const transferSyntax = generateTransferSyntax(input.orgCode, input.packageCode)
  const qrImageUrl = buildVietQrImageUrl(
    bank.bankBin,
    bank.accountNumber,
    input.amountVnd,
    transferSyntax,
    bank.accountHolder,
  )

  // Thời hạn giao dịch: 15 phút từ thời điểm tạo
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  return {
    bankName: bank.bankName,
    bankBin: bank.bankBin,
    accountNumber: bank.accountNumber,
    accountHolder: bank.accountHolder,
    amountVnd: input.amountVnd,
    transferSyntax,
    qrImageUrl,
    expiresAt,
  }
}

/**
 * Kiểm định cú pháp chuyển khoản có khớp mã tổ chức hay không
 */
export function parseTransferSyntax(content: string): { isValid: boolean; orgCode?: string | undefined; packageCode?: string | undefined } {
  const normalized = content.toUpperCase().replace(/[^A-Z0-9\s]/g, " ")
  const parts = normalized.split(/\s+/).filter(Boolean)

  if (parts.length >= 3 && parts[0] === "FLO") {
    return {
      isValid: true,
      orgCode: parts[1],
      packageCode: parts[2],
    }
  }

  return { isValid: false }
}
